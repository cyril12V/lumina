import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'lumina-secret-key-change-in-production';

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Helper to get user's team
const getUserTeam = (userId: string) => {
  return db.prepare(`
    SELECT t.id as team_id, tm.role
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ?
  `).get(userId) as any;
};

// Helper to create notification
const createNotification = (userId: string, type: string, title: string, message: string, link?: string) => {
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), userId, type, title, message, link || null);
};

router.use(authenticateToken);

// ============== TASKS ==============

// Get all tasks
router.get('/', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { status, assigned_to, session_id, priority } = req.query;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    let query = `
      SELECT t.*,
             u.full_name as assigned_to_name,
             c.full_name as created_by_name,
             s.title as session_title
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users c ON t.created_by = c.id
      LEFT JOIN sessions s ON t.session_id = s.id
      WHERE t.team_id = ?
    `;
    const params: any[] = [team.team_id];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }
    if (session_id) {
      query += ' AND t.session_id = ?';
      params.push(session_id);
    }
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END, t.deadline ASC, t.created_at DESC';

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get my tasks
router.get('/my-tasks', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    let query = `
      SELECT t.*,
             c.full_name as created_by_name,
             s.title as session_title
      FROM tasks t
      LEFT JOIN users c ON t.created_by = c.id
      LEFT JOIN sessions s ON t.session_id = s.id
      WHERE t.assigned_to = ?
    `;
    const params: any[] = [userId];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    } else {
      query += ' AND t.status != \'completed\' AND t.status != \'cancelled\'';
    }

    query += ' ORDER BY CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END, t.deadline ASC, t.priority DESC';

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get single task
router.get('/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const task = db.prepare(`
      SELECT t.*,
             u.full_name as assigned_to_name,
             c.full_name as created_by_name,
             s.title as session_title
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users c ON t.created_by = c.id
      LEFT JOIN sessions s ON t.session_id = s.id
      WHERE t.id = ? AND t.team_id = ?
    `).get(id, team.team_id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get comments
    const comments = db.prepare(`
      SELECT tc.*, u.full_name as user_name
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `).all(id);

    res.json({ ...task, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Create task
router.post('/', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const {
      title, description, session_id, assigned_to, priority,
      estimated_duration_minutes, deadline
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO tasks (
        id, team_id, session_id, title, description, assigned_to, created_by,
        priority, estimated_duration_minutes, deadline
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, team.team_id, session_id || null, title, description || null,
      assigned_to || null, userId, priority || 'medium',
      estimated_duration_minutes || null, deadline || null
    );

    // Notify assignee
    if (assigned_to && assigned_to !== userId) {
      createNotification(
        assigned_to,
        'task_assigned',
        'Nouvelle tache',
        `Vous avez ete assigne a: ${title}`,
        `/tasks/${id}`
      );
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const {
      title, description, status, assigned_to, priority,
      estimated_duration_minutes, actual_duration_minutes, deadline
    } = req.body;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const existing = db.prepare(`
      SELECT * FROM tasks WHERE id = ? AND team_id = ?
    `).get(id, team.team_id) as any;

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Track status changes
    let started_at = existing.started_at;
    let completed_at = existing.completed_at;

    if (status === 'in_progress' && existing.status === 'pending') {
      started_at = new Date().toISOString();
    }
    if (status === 'completed' && existing.status !== 'completed') {
      completed_at = new Date().toISOString();

      // Notify creator
      if (existing.created_by !== userId) {
        createNotification(
          existing.created_by,
          'task_completed',
          'Tache terminee',
          `La tache "${existing.title}" a ete terminee`,
          `/tasks/${id}`
        );
      }
    }

    // Notify new assignee
    if (assigned_to && assigned_to !== existing.assigned_to && assigned_to !== userId) {
      createNotification(
        assigned_to,
        'task_assigned',
        'Nouvelle tache',
        `Vous avez ete assigne a: ${existing.title}`,
        `/tasks/${id}`
      );
    }

    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        assigned_to = COALESCE(?, assigned_to),
        priority = COALESCE(?, priority),
        estimated_duration_minutes = COALESCE(?, estimated_duration_minutes),
        actual_duration_minutes = COALESCE(?, actual_duration_minutes),
        deadline = COALESCE(?, deadline),
        started_at = ?,
        completed_at = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title, description, status, assigned_to, priority,
      estimated_duration_minutes, actual_duration_minutes, deadline,
      started_at, completed_at, id
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const result = db.prepare(`
      DELETE FROM tasks WHERE id = ? AND team_id = ?
    `).run(id, team.team_id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Add comment
router.post('/:id/comments', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const task = db.prepare(`
      SELECT * FROM tasks WHERE id = ? AND team_id = ?
    `).get(id, team.team_id) as any;

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const commentId = uuidv4();
    db.prepare(`
      INSERT INTO task_comments (id, task_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `).run(commentId, id, userId, content);

    // Notify assignee if different from commenter
    if (task.assigned_to && task.assigned_to !== userId) {
      createNotification(
        task.assigned_to,
        'task_assigned',
        'Nouveau commentaire',
        `Nouveau commentaire sur: ${task.title}`,
        `/tasks/${id}`
      );
    }

    const comment = db.prepare(`
      SELECT tc.*, u.full_name as user_name
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = ?
    `).get(commentId);

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ============== WORKFLOW TEMPLATES ==============

// Get workflow templates
router.get('/workflows/templates', (req: any, res) => {
  try {
    const userId = req.user.userId;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const templates = db.prepare(`
      SELECT wt.*,
             (SELECT COUNT(*) FROM workflow_steps ws WHERE ws.workflow_id = wt.id) as steps_count
      FROM workflow_templates wt
      WHERE wt.team_id = ?
      ORDER BY wt.name
    `).all(team.team_id);

    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get workflow templates' });
  }
});

// Get workflow template with steps
router.get('/workflows/templates/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const template = db.prepare(`
      SELECT * FROM workflow_templates WHERE id = ? AND team_id = ?
    `).get(id, team.team_id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const steps = db.prepare(`
      SELECT ws.*, tt.name as task_template_name
      FROM workflow_steps ws
      LEFT JOIN task_templates tt ON ws.task_template_id = tt.id
      WHERE ws.workflow_id = ?
      ORDER BY ws.sort_order
    `).all(id);

    res.json({ ...template, steps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get workflow template' });
  }
});

// Create workflow template
router.post('/workflows/templates', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, trigger_event, steps } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO workflow_templates (id, team_id, name, description, trigger_event)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, team.team_id, name, description || null, trigger_event || 'manual');

    // Add steps
    if (steps && Array.isArray(steps)) {
      const insertStep = db.prepare(`
        INSERT INTO workflow_steps (
          id, workflow_id, task_template_id, name, description,
          duration_minutes, assignee_role, delay_days, depends_on_step_id, sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const stepIds: Record<number, string> = {};

      steps.forEach((step: any, index: number) => {
        const stepId = uuidv4();
        stepIds[index] = stepId;

        const dependsOnId = step.depends_on_index !== undefined
          ? stepIds[step.depends_on_index] || null
          : null;

        insertStep.run(
          stepId, id, step.task_template_id || null, step.name,
          step.description || null, step.duration_minutes || 60,
          step.assignee_role || null, step.delay_days || 0,
          dependsOnId, index
        );
      });
    }

    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create workflow template' });
  }
});

// Execute workflow (create tasks from template)
router.post('/workflows/execute/:templateId', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { templateId } = req.params;
    const { session_id, base_date } = req.body;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const template = db.prepare(`
      SELECT * FROM workflow_templates WHERE id = ? AND team_id = ?
    `).get(templateId, team.team_id) as any;

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const steps = db.prepare(`
      SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY sort_order
    `).all(templateId) as any[];

    const startDate = base_date ? new Date(base_date) : new Date();
    const createdTasks: string[] = [];

    // Create tasks from steps
    steps.forEach((step) => {
      const taskId = uuidv4();

      // Calculate deadline based on delay
      const deadline = new Date(startDate);
      deadline.setDate(deadline.getDate() + (step.delay_days || 0));

      // Find assignee based on role
      let assignee = null;
      if (step.assignee_role) {
        const member = db.prepare(`
          SELECT user_id FROM team_members
          WHERE team_id = ? AND role = ?
          LIMIT 1
        `).get(team.team_id, step.assignee_role) as any;
        assignee = member?.user_id;
      }

      db.prepare(`
        INSERT INTO tasks (
          id, team_id, session_id, workflow_step_id, title, description,
          assigned_to, created_by, estimated_duration_minutes, deadline
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        taskId, team.team_id, session_id || null, step.id,
        step.name, step.description, assignee, userId,
        step.duration_minutes, deadline.toISOString()
      );

      createdTasks.push(taskId);

      // Notify assignee
      if (assignee && assignee !== userId) {
        createNotification(
          assignee,
          'task_assigned',
          'Nouvelle tache',
          `Vous avez ete assigne a: ${step.name}`,
          `/tasks/${taskId}`
        );
      }
    });

    res.json({ created_tasks: createdTasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// ============== TASK TEMPLATES ==============

// Get task templates
router.get('/templates', (req: any, res) => {
  try {
    const userId = req.user.userId;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const templates = db.prepare(`
      SELECT * FROM task_templates WHERE team_id = ? ORDER BY name
    `).all(team.team_id);

    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get task templates' });
  }
});

// Create task template
router.post('/templates', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, default_duration_minutes, default_assignee_role, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO task_templates (id, team_id, name, description, default_duration_minutes, default_assignee_role, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, team.team_id, name, description || null, default_duration_minutes || 60, default_assignee_role || null, category || 'general');

    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task template' });
  }
});

export { router as tasksRouter };
