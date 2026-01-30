import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { clientPortal } from '../../lib/api';

interface QuestionnaireProps {
  token: string;
  photographerName: string;
  onBack: () => void;
}

interface EventType {
  id: string;
  name: string;
  icon: string;
}

interface Question {
  id: string;
  question: string;
  field_type: string;
  options: string[] | null;
  is_required: number;
  placeholder: string | null;
  help_text: string | null;
  condition_field: string | null;
  condition_value: string | null;
}

const Questionnaire: React.FC<QuestionnaireProps> = ({ token, photographerName, onBack }) => {
  const [step, setStep] = useState<'select' | 'fill'>('select');
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadEventTypes();
  }, []);

  const loadEventTypes = async () => {
    try {
      setLoading(true);
      const types = await clientPortal.getEventTypes(token);
      setEventTypes(types);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionnaire = async (eventTypeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientPortal.getQuestionnaire(token, eventTypeId);
      setQuestions(data.questions);
      setResponses(data.savedResponses || {});
      setIsLocked(data.isLocked);
      setStep('fill');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEventType = (type: EventType) => {
    setSelectedEventType(type);
    loadQuestionnaire(type.id);
  };

  const handleResponseChange = (questionId: string, value: any) => {
    if (isLocked) return;
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const saveDraft = async () => {
    if (!selectedEventType || isLocked) return;

    try {
      setSaving(true);
      setError(null);
      await clientPortal.saveQuestionnaire(token, selectedEventType.id, responses);
      setSuccess('Brouillon sauvegardé');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const validateQuestionnaire = async () => {
    if (!selectedEventType || isLocked) return;

    try {
      setValidating(true);
      setError(null);
      await clientPortal.validateQuestionnaire(token, selectedEventType.id, responses);
      setSuccess('Questionnaire validé avec succès !');
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  const isQuestionVisible = (question: Question) => {
    if (!question.condition_field || !question.condition_value) return true;
    return responses[question.condition_field] === question.condition_value;
  };

  const renderField = (question: Question) => {
    const value = responses[question.id] || '';

    switch (question.field_type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={question.field_type === 'email' ? 'email' : question.field_type === 'phone' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder={question.placeholder || ''}
            disabled={isLocked}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant disabled:bg-zinc-50 disabled:text-zinc-500"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder={question.placeholder || ''}
            disabled={isLocked}
            rows={4}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant disabled:bg-zinc-50 disabled:text-zinc-500 resize-none"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder={question.placeholder || ''}
            disabled={isLocked}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant disabled:bg-zinc-50 disabled:text-zinc-500"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            disabled={isLocked}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant disabled:bg-zinc-50 disabled:text-zinc-500"
          />
        );

      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            disabled={isLocked}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant disabled:bg-zinc-50 disabled:text-zinc-500"
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            disabled={isLocked}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant disabled:bg-zinc-50 disabled:text-zinc-500"
          />
        );

      case 'select':
        return (
          <div className="relative">
            <select
              value={value}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              disabled={isLocked}
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant disabled:bg-zinc-50 disabled:text-zinc-500 appearance-none"
            >
              <option value="">Sélectionner...</option>
              {question.options?.map((option, i) => (
                <option key={i} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map((option, i) => (
              <label key={i} className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  disabled={isLocked}
                  className="w-4 h-4 text-vibrant focus:ring-vibrant"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        const checkedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {question.options?.map((option, i) => (
              <label key={i} className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                <input
                  type="checkbox"
                  value={option}
                  checked={checkedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...checkedValues, option]
                      : checkedValues.filter(v => v !== option);
                    handleResponseChange(question.id, newValues);
                  }}
                  disabled={isLocked}
                  className="w-4 h-4 text-vibrant focus:ring-vibrant rounded"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            disabled={isLocked}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant disabled:bg-zinc-50 disabled:text-zinc-500"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-vibrant border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // Event Type Selection
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-[#F3F2EE]">
        <header className="bg-white border-b border-zinc-200">
          <div className="max-w-2xl mx-auto px-6 py-4">
            <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-black">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold mb-2">Quel type de projet ?</h1>
          <p className="text-zinc-500 mb-8">Sélectionnez le type d'événement pour personnaliser votre questionnaire.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {eventTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectEventType(type)}
                className="p-6 bg-white rounded-2xl text-left hover:shadow-lg transition-all border border-zinc-100 hover:border-vibrant"
              >
                <h3 className="font-bold text-lg">{type.name}</h3>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Questionnaire Form
  return (
    <div className="min-h-screen bg-[#F3F2EE]">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-black">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          {!isLocked && (
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {isLocked && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-700">Ce questionnaire a été validé et ne peut plus être modifié.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-2">
          Questionnaire {selectedEventType?.name}
        </h1>
        <p className="text-zinc-500 mb-8">
          Répondez aux questions ci-dessous pour nous aider à préparer votre projet.
        </p>

        <div className="space-y-6">
          {questions.filter(isQuestionVisible).map((question) => (
            <div key={question.id} className="bg-white rounded-2xl p-6 border border-zinc-100">
              <label className="block mb-3">
                <span className="font-medium">
                  {question.question}
                  {question.is_required ? <span className="text-red-500 ml-1">*</span> : ''}
                </span>
                {question.help_text && (
                  <p className="text-sm text-zinc-400 mt-1">{question.help_text}</p>
                )}
              </label>
              {renderField(question)}
            </div>
          ))}
        </div>

        {!isLocked && questions.length > 0 && (
          <div className="mt-8 space-y-4">
            <button
              onClick={validateQuestionnaire}
              disabled={validating}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-vibrant text-white rounded-xl font-medium hover:bg-vibrant/90 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {validating ? 'Validation...' : 'Valider définitivement'}
            </button>
            <p className="text-center text-sm text-zinc-400">
              Une fois validé, le questionnaire ne pourra plus être modifié
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Questionnaire;
