import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Undo,
  Redo
} from 'lucide-react';
import { espaceClient, auth } from '../../lib/api';

interface ContractEditorProps {
  contractId: string;
  initialContent: string;
  onBack: () => void;
  onValidate: (sendEmail: boolean) => Promise<void>;
}

const ContractEditor: React.FC<ContractEditorProps> = ({
  contractId,
  initialContent,
  onBack,
  onValidate
}) => {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const user = auth.getUser();

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const saveContract = async () => {
    if (!editorRef.current) return;

    try {
      setSaving(true);
      await espaceClient.updateContract(contractId, {
        content: editorRef.current.innerHTML,
        user_id: user.id
      });
    } catch (error) {
      console.error('Error saving contract:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async (sendEmail: boolean) => {
    try {
      setValidating(true);
      await saveContract();
      await onValidate(sendEmail);
      setShowValidateModal(false);
      onBack();
    } catch (error) {
      console.error('Error validating contract:', error);
    } finally {
      setValidating(false);
    }
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }> = ({ onClick, active, children, title }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active ? 'bg-vibrant/10 text-vibrant' : 'hover:bg-zinc-100 text-zinc-600'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Éditeur de contrat</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveContract}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            onClick={() => setShowValidateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-vibrant text-white rounded-xl font-medium hover:bg-vibrant/90"
          >
            <Send className="w-4 h-4" />
            Valider le contrat
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-t-2xl border border-b-0 border-zinc-200 p-2 flex items-center gap-1 flex-wrap">
        <ToolbarButton onClick={() => execCommand('undo')} title="Annuler">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('redo')} title="Rétablir">
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-200 mx-2" />

        <ToolbarButton onClick={() => execCommand('formatBlock', 'h1')} title="Titre 1">
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('formatBlock', 'h2')} title="Titre 2">
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-200 mx-2" />

        <ToolbarButton onClick={() => execCommand('bold')} title="Gras">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('italic')} title="Italique">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('underline')} title="Souligné">
          <Underline className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-200 mx-2" />

        <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Liste à puces">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Liste numérotée">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-200 mx-2" />

        <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Aligner à gauche">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Centrer">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyRight')} title="Aligner à droite">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-white border border-zinc-200 rounded-b-2xl overflow-hidden">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="h-full p-8 overflow-y-auto focus:outline-none prose prose-sm max-w-none"
          style={{
            minHeight: '500px'
          }}
        />
      </div>

      {/* Variables Help */}
      <div className="mt-4 p-4 bg-blue-50 rounded-xl text-sm">
        <p className="font-medium text-blue-800 mb-2">Variables disponibles :</p>
        <div className="flex flex-wrap gap-2">
          {[
            '{{client_name}}',
            '{{client_email}}',
            '{{client_address}}',
            '{{photographer_name}}',
            '{{photographer_address}}',
            '{{photographer_siret}}',
            '{{event_type}}',
            '{{date}}'
          ].map((v) => (
            <code key={v} className="px-2 py-1 bg-white rounded text-blue-600 text-xs">
              {v}
            </code>
          ))}
        </div>
      </div>

      {/* Validate Modal */}
      {showValidateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Valider le contrat</h2>
            <p className="text-zinc-600 mb-6">
              Une fois validé, le contrat sera figé et envoyé au client pour signature.
              Cette action est irréversible.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleValidate(true)}
                disabled={validating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-vibrant text-white rounded-xl font-medium hover:bg-vibrant/90 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {validating ? 'Validation...' : 'Valider et notifier le client'}
              </button>
              <button
                onClick={() => handleValidate(false)}
                disabled={validating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-50"
              >
                Valider sans notification
              </button>
              <button
                onClick={() => setShowValidateModal(false)}
                disabled={validating}
                className="w-full px-4 py-3 text-zinc-500 hover:text-black"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractEditor;
