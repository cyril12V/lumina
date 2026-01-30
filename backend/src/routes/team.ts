import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

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

router.use(authenticateToken);

// ============== TEAM MANAGEMENT ==============

// Get or create team for user
router.get('/my-team', (req: any, res) => {
  try {
    const userId = req.user.userId;

    // Check if user has a team (as owner or member)
    let team = db.prepare(`
      SELECT t.*, tm.role as my_role
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
    `).get(userId) as any;

    // If no team, create one
    if (!team) {
      const teamId = uuidv4();
      const user = db.prepare('SELECT full_name, business_name FROM users WHERE id = ?').get(userId) as any;
      const teamName = user?.business_name || user?.full_name || 'Mon equipe';

      db.prepare(`
        INSERT INTO teams (id, owner_id, name)
        VALUES (?, ?, ?)
      `).run(teamId, userId, teamName);

      // Add owner as team member
      db.prepare(`
        INSERT INTO team_members (id, team_id, user_id, role)
        VALUES (?, ?, ?, 'owner')
      `).run(uuidv4(), teamId, userId);

      team = db.prepare(`
        SELECT t.*, 'owner' as my_role
        FROM teams t
        WHERE t.id = ?
      `).get(teamId);
    }

    // Get team members
    const members = db.prepare(`
      SELECT tm.*, u.email, u.full_name, u.logo_url
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY
        CASE tm.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'photographer' THEN 3
          WHEN 'retoucher' THEN 4
          WHEN 'assistant' THEN 5
        END
    `).all(team.id);

    // Get pending invitations
    const invitations = db.prepare(`
      SELECT ti.*, u.full_name as invited_by_name
      FROM team_invitations ti
      JOIN users u ON ti.invited_by = u.id
      WHERE ti.team_id = ? AND ti.accepted_at IS NULL AND ti.expires_at > datetime('now')
    `).all(team.id);

    res.json({
      ...team,
      members,
      invitations,
      canInvite: members.length < team.max_members
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get team' });
  }
});

// Update team name
router.put('/my-team', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    // Verify user is owner or admin
    const member = db.prepare(`
      SELECT tm.role FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ? AND tm.role IN ('owner', 'admin')
    `).get(userId) as any;

    if (!member) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const team = db.prepare(`
      SELECT t.id FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
    `).get(userId) as any;

    db.prepare(`
      UPDATE teams SET name = ?, updated_at = datetime('now') WHERE id = ?
    `).run(name, team.id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// ============== INVITATIONS ==============

// Create invitation
router.post('/invitations', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { email, role, send_email } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role required' });
    }

    if (!['admin', 'photographer', 'retoucher', 'assistant'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Get user's team
    const teamMember = db.prepare(`
      SELECT tm.team_id, tm.role, t.max_members
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ? AND tm.role IN ('owner', 'admin')
    `).get(userId) as any;

    if (!teamMember) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Check member limit
    const currentCount = db.prepare(`
      SELECT COUNT(*) as count FROM team_members WHERE team_id = ?
    `).get(teamMember.team_id) as any;

    if (currentCount.count >= teamMember.max_members) {
      return res.status(400).json({ error: 'Team member limit reached (max 4)' });
    }

    // Check if already invited or member
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (existingUser) {
      const existingMember = db.prepare(`
        SELECT id FROM team_members WHERE team_id = ? AND user_id = ?
      `).get(teamMember.team_id, existingUser.id);
      if (existingMember) {
        return res.status(400).json({ error: 'User is already a team member' });
      }
    }

    const existingInvite = db.prepare(`
      SELECT id FROM team_invitations
      WHERE team_id = ? AND email = ? AND accepted_at IS NULL AND expires_at > datetime('now')
    `).get(teamMember.team_id, email);

    if (existingInvite) {
      return res.status(400).json({ error: 'Invitation already sent to this email' });
    }

    // Create invitation
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    db.prepare(`
      INSERT INTO team_invitations (id, team_id, email, role, token, invited_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, teamMember.team_id, email.toLowerCase(), role, token, userId, expiresAt);

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join-team/${token}`;

    // TODO: Send email if send_email is true
    if (send_email) {
      console.log(`[EMAIL] Invitation sent to ${email}: ${inviteUrl}`);
    }

    res.status(201).json({
      id,
      token,
      inviteUrl,
      email,
      role,
      expires_at: expiresAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// Cancel invitation
router.delete('/invitations/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify permission
    const invitation = db.prepare(`
      SELECT ti.* FROM team_invitations ti
      JOIN team_members tm ON ti.team_id = tm.team_id
      WHERE ti.id = ? AND tm.user_id = ? AND tm.role IN ('owner', 'admin')
    `).get(id, userId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    db.prepare('DELETE FROM team_invitations WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

// Get invitation info (public - for join page)
router.get('/invitations/info/:token', (req: any, res) => {
  try {
    const { token } = req.params;

    const invitation = db.prepare(`
      SELECT ti.*, t.name as team_name, u.full_name as invited_by_name
      FROM team_invitations ti
      JOIN teams t ON ti.team_id = t.id
      JOIN users u ON ti.invited_by = u.id
      WHERE ti.token = ? AND ti.accepted_at IS NULL
    `).get(token) as any;

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or expired' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation expired' });
    }

    res.json({
      email: invitation.email,
      role: invitation.role,
      team_name: invitation.team_name,
      invited_by_name: invitation.invited_by_name,
      expires_at: invitation.expires_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get invitation' });
  }
});

// Accept invitation (called after registration or login)
router.post('/invitations/accept/:token', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { token } = req.params;

    const invitation = db.prepare(`
      SELECT * FROM team_invitations
      WHERE token = ? AND accepted_at IS NULL AND expires_at > datetime('now')
    `).get(token) as any;

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or expired' });
    }

    // Verify email matches
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as any;
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(400).json({ error: 'Email does not match invitation' });
    }

    // Check if already a member
    const existingMember = db.prepare(`
      SELECT id FROM team_members WHERE team_id = ? AND user_id = ?
    `).get(invitation.team_id, userId);

    if (existingMember) {
      return res.status(400).json({ error: 'Already a team member' });
    }

    // Add to team
    db.prepare(`
      INSERT INTO team_members (id, team_id, user_id, role)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), invitation.team_id, userId, invitation.role);

    // Mark invitation as accepted
    db.prepare(`
      UPDATE team_invitations SET accepted_at = datetime('now') WHERE id = ?
    `).run(invitation.id);

    // Create notification for team owner
    const team = db.prepare('SELECT owner_id FROM teams WHERE id = ?').get(invitation.team_id) as any;
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, 'team_invite', ?, ?)
    `).run(uuidv4(), team.owner_id, 'Nouveau membre', `${user.email} a rejoint votre equipe`);

    res.json({ success: true, team_id: invitation.team_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// ============== MEMBER MANAGEMENT ==============

// Update member role
router.put('/members/:memberId/role', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { memberId } = req.params;
    const { role } = req.body;

    if (!['admin', 'photographer', 'retoucher', 'assistant'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Verify user is owner
    const member = db.prepare(`
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = ? AND tm.role = 'owner'
    `).get(userId) as any;

    if (!member) {
      return res.status(403).json({ error: 'Only owner can change roles' });
    }

    // Check target is not owner
    const target = db.prepare(`
      SELECT role FROM team_members WHERE id = ? AND team_id = ?
    `).get(memberId, member.team_id) as any;

    if (!target) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (target.role === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    db.prepare('UPDATE team_members SET role = ? WHERE id = ?').run(role, memberId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Remove member
router.delete('/members/:memberId', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { memberId } = req.params;

    // Verify user is owner or admin
    const member = db.prepare(`
      SELECT tm.team_id, tm.role FROM team_members tm
      WHERE tm.user_id = ? AND tm.role IN ('owner', 'admin')
    `).get(userId) as any;

    if (!member) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Check target
    const target = db.prepare(`
      SELECT user_id, role FROM team_members WHERE id = ? AND team_id = ?
    `).get(memberId, member.team_id) as any;

    if (!target) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (target.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove owner' });
    }

    // Admin can only remove lower roles
    if (member.role === 'admin' && target.role === 'admin') {
      return res.status(403).json({ error: 'Admin cannot remove another admin' });
    }

    db.prepare('DELETE FROM team_members WHERE id = ?').run(memberId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Leave team (for non-owners)
router.post('/leave', (req: any, res) => {
  try {
    const userId = req.user.userId;

    const member = db.prepare(`
      SELECT id, role FROM team_members WHERE user_id = ?
    `).get(userId) as any;

    if (!member) {
      return res.status(404).json({ error: 'Not a team member' });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Owner cannot leave team' });
    }

    db.prepare('DELETE FROM team_members WHERE id = ?').run(member.id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to leave team' });
  }
});

export { router as teamRouter };
