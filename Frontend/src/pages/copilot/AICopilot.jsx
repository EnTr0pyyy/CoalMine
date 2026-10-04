import { useEffect, useRef, useState } from 'react';
import {
  Send,
  Bot,
  AlertTriangle,
  Menu,
  FileText,
  Upload,
  CheckCircle2,
  Database,
  Zap,
  X,
  RefreshCw,
  Trash2,
  Server,
  Eye,
  Copy,
  Check,
  Search,
  Link2,
  ListTodo,
} from 'lucide-react';
import ChatSidebar from '../../components/copilot/ChatSidebar.jsx';
import ChatMessage from '../../components/copilot/ChatMessage.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import Button from '../../components/common/Button.jsx';
import { chatService } from '../../services/chatService.js';
import { CHAT_SUGGESTED_QUESTIONS } from '../../data/mockData.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AICopilot() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Persistence toggle: Persistent (DB) vs Temporary ("Once Chat")
  const [isPersistent, setIsPersistent] = useState(true);
  const [workspace, setWorkspace] = useState(null);

  // RAG Document Drawer / Modal state
  const [ragDrawerOpen, setRagDrawerOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [indexedDocs, setIndexedDocs] = useState([]);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Document Viewer state
  const [inspectingDoc, setInspectingDoc] = useState(null);
  const [loadingDocChunks, setLoadingDocChunks] = useState(false);
  const [chunkSearch, setChunkSearch] = useState('');
  const [viewMode, setViewMode] = useState('chunks'); // 'chunks' | 'fulltext'
  const [docCopied, setDocCopied] = useState(false);

  async function loadConversations(selectId) {
    setLoadingList(true);
    try {
      const list = await chatService.getConversations();
      setConversations(list);
      if (selectId) {
        setActiveId(selectId);
      } else if (!activeId && list.length > 0) {
        setActiveId(list[0].id);
        setIsPersistent(list[0].isPersistent ?? true);
      }
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadDocuments() {
    try {
      const docs = await chatService.getDocuments();
      setIndexedDocs(docs);
    } catch (e) {
      console.warn('Failed to load indexed documents:', e);
    }
  }

  async function loadWorkspace(sessionId = activeId) {
    if (!sessionId) {
      setWorkspace(null);
      return;
    }
    try {
      const loaded = await chatService.getWorkspace(sessionId);
      setWorkspace(loaded);
    } catch (_) {
      setWorkspace(null);
    }
  }

  useEffect(() => {
    setActiveId(null);
    setConversations([]);
    loadConversations();
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!activeId || !isPersistent) {
      setWorkspace(null);
      return undefined;
    }
    loadWorkspace(activeId);
    const interval = window.setInterval(() => loadWorkspace(activeId), 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, isPersistent]);

  useEffect(() => {
    if (!activeId) return undefined;
    let mounted = true;
    chatService.getConversation(activeId).then((full) => {
      if (mounted && full?.messages) {
        setConversations((prev) => prev.map((conversation) => (
          conversation.id === activeId ? { ...conversation, messages: full.messages } : conversation
        )));
      }
    });
    return () => { mounted = false; };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversations, activeId, sending]);

  const active = conversations.find((c) => c.id === activeId);
  const workspaceDocuments = workspace?.documents || [];
  const workspaceTasks = workspace?.tasks || [];
  const runningTasks = workspaceTasks.filter((task) => !['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status));

  async function handleNewChat(persistentOverride) {
    const persist = persistentOverride !== undefined ? persistentOverride : isPersistent;
    const conv = await chatService.createConversation(
      persist,
      persist ? 'Saved Conversation' : 'Temporary Chat'
    );
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  }

  async function handleSelect(id) {
    setActiveId(id);
    setMobileSidebarOpen(false);
    const selected = conversations.find((c) => c.id === id);
    if (selected) {
      setIsPersistent(selected.isPersistent ?? true);
      // The session list only includes a preview; always restore full durable history.
      const full = await chatService.getConversation(id);
      if (full && full.messages) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, messages: full.messages } : c))
        );
      }
    }
  }

  async function handleRename(id, title) {
    await chatService.renameConversation(id, title);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }

  async function handleDelete(id) {
    await chatService.deleteConversation(id);
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (id === activeId) {
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  async function handleWipeTemporaryChat() {
    if (!activeId) return;
    await chatService.deleteConversation(activeId);
    setConversations((prev) => prev.filter((c) => c.id !== activeId));
    handleNewChat(false);
  }

  async function handleSend(text) {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setInput('');
    setError(null);

    let conversationId = activeId;
    if (!conversationId) {
      const conv = await chatService.createConversation(
        isPersistent,
        isPersistent ? 'Saved Conversation' : 'Temporary Chat'
      );
      conversationId = conv.id;
      setActiveId(conversationId);
      setConversations((prev) => [conv, ...prev]);
    }

    const userMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    const assistantPlaceholderId = `msg-${Date.now()}-a`;
    const assistantMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    // Append user message & empty assistant placeholder immediately
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          const updatedMessages = [...(c.messages || []), userMessage, assistantMessage];
          return {
            ...c,
            title: c.messages.length === 0 ? message.slice(0, 30) : c.title,
            messages: updatedMessages,
          };
        }
        return c;
      })
    );

    setSending(true);

    try {
      await chatService.streamChatMessage({
        sessionId: conversationId,
        message,
        isPersistent,
        onToken: (_token, accumulated) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === conversationId) {
                const updatedMessages = c.messages.map((m) =>
                  m.id === assistantPlaceholderId ? { ...m, content: accumulated } : m
                );
                return { ...c, messages: updatedMessages };
              }
              return c;
            })
          );
        },
        onComplete: (fullText) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === conversationId) {
                const updatedMessages = c.messages.map((m) =>
                  m.id === assistantPlaceholderId ? { ...m, content: fullText } : m
                );
                return { ...c, messages: updatedMessages };
              }
              return c;
            })
          );
        },
        onError: (err) => {
          setError(err.message || 'Error occurred during streaming.');
        },
        onTask: () => loadWorkspace(conversationId),
      });
    } catch (err) {
      setError(err.message || 'Failed to send message to AI Copilot.');
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Documents are attached to a saved workspace at ingestion time, so the
      // Copilot retrieves them only for this conversation rather than globally.
      let sessionId = activeId;
      if (!sessionId || !isPersistent) {
        const conv = await chatService.createConversation(true, 'Document Workspace');
        sessionId = conv.id;
        setConversations((prev) => [conv, ...prev]);
        setActiveId(sessionId);
        setIsPersistent(true);
      }
      const res = await chatService.uploadDocument(file, sessionId);
      setUploadSuccess(`Attached "${res.filename}" to this workspace and indexed ${res.chunks_count} chunks.`);
      await loadDocuments();
      await loadWorkspace(sessionId);
    } catch (err) {
      setUploadError(err.message || 'Failed to ingest document.');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleInspectDocument(doc) {
    setLoadingDocChunks(true);
    setInspectingDoc({ document_id: doc.document_id, filename: doc.filename, chunks: [] });
    setChunkSearch('');
    setDocCopied(false);
    try {
      const data = await chatService.getDocumentChunks(doc.document_id);
      if (data && data.chunks) {
        setInspectingDoc(data);
      }
    } catch (e) {
      console.warn('Failed to load document chunks:', e);
    } finally {
      setLoadingDocChunks(false);
    }
  }

  async function handleDeleteDocument(documentId, e) {
    if (e) e.stopPropagation();
    const ok = window.confirm('Are you sure you want to remove this document from the RAG knowledge base?');
    if (!ok) return;
    await chatService.deleteDocument(documentId);
    if (inspectingDoc && inspectingDoc.document_id === documentId) {
      setInspectingDoc(null);
    }
    await loadDocuments();
  }

  function handleCopyFullText() {
    if (!inspectingDoc || !inspectingDoc.chunks) return;
    const fullText = inspectingDoc.chunks.map((c) => c.content).join('\n\n');
    navigator.clipboard?.writeText(fullText);
    setDocCopied(true);
    setTimeout(() => setDocCopied(false), 2000);
  }

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] sm:-m-6 lg:-m-8">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNewChat={() => handleNewChat()}
        onRename={handleRename}
        onDelete={handleDelete}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-surface-canvas">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-card px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded p-1.5 text-ink-700 hover:bg-surface-sunken lg:hidden"
              aria-label="Open chat list"
            >
              <Menu size={18} />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white shadow-xs">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-ink-900">CoalGov AI Copilot</h1>
                <span className="rounded bg-brand-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-700">
                  gemma3:1b
                </span>
                {user?.role && (
                  <span className="rounded bg-surface-sunken border border-border px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink-700 uppercase">
                    {user.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-500">
                Governance, DGMS statutory compliance, and RAG knowledge assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Offline AI Server Indicator */}
            <div className="hidden items-center gap-1.5 rounded-full border border-status-success/30 bg-status-successBg px-2 py-1 text-[11px] font-medium text-status-success sm:flex">
              <Server size={12} />
              <span>Offline Server</span>
            </div>

            {/* Persistence Mode Toggle */}
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-sunken px-2.5 py-1.5">
              {isPersistent ? (
                <Database size={14} className="text-status-success" />
              ) : (
                <Zap size={14} className="text-status-warning" />
              )}
              <div className="flex flex-col">
                <span className="text-[11px] font-medium leading-none text-ink-900">
                  {isPersistent ? 'Persistent' : 'Once Chat'}
                </span>
                <span className="text-[9px] text-ink-500">
                  {isPersistent ? 'Saved to DB' : 'Temporary'}
                </span>
              </div>
              <label className="relative ml-1 inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isPersistent}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setIsPersistent(next);
                    if (active && active.isPersistent !== next) {
                      handleNewChat(next);
                    }
                  }}
                  className="peer sr-only"
                />
                <div className="peer h-4 w-7 rounded-full bg-border-strong after:absolute after:left-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-800 peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            {/* Wipe Temporary Chat Button (Only visible in Once Chat mode with messages) */}
            {!isPersistent && active && active.messages && active.messages.length > 0 && (
              <button
                onClick={handleWipeTemporaryChat}
                className="flex items-center gap-1 rounded border border-status-danger/30 bg-status-dangerBg/50 px-2 py-1.5 text-xs font-medium text-status-danger hover:bg-status-dangerBg"
                title="Immediately erase this temporary chat from memory"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">Wipe Chat</span>
              </button>
            )}

            {/* RAG Knowledge Base Button */}
            <button
              onClick={() => setRagDrawerOpen(!ragDrawerOpen)}
              className="flex items-center gap-1.5 rounded border border-border bg-surface-card px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:border-brand-600 hover:text-brand-800"
            >
              <FileText size={14} className="text-brand-700" />
              <span>RAG Docs</span>
              {indexedDocs.length > 0 && (
                <span className="rounded-full bg-brand-800 px-1.5 py-0.2 text-[10px] text-white">
                  {indexedDocs.length}
                </span>
              )}
            </button>
            {isPersistent && active && (
              <div className="hidden items-center gap-1.5 rounded border border-brand-200 bg-brand-100/50 px-2.5 py-1.5 text-xs text-brand-800 md:flex">
                <Link2 size={13} />
                <span>{workspaceDocuments.length} attached</span>
                {runningTasks.length > 0 && (
                  <span className="ml-1 flex items-center gap-1 text-status-warning">
                    <ListTodo size={13} /> {runningTasks.length} running
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RAG Document Drawer / Modal */}
        {ragDrawerOpen && (
          <div className="border-b border-border bg-brand-100/40 p-4 transition-all">
            <div className="mx-auto max-w-3xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-brand-800" />
                  <h3 className="text-xs font-bold text-ink-900">
                    RAG Knowledge Base (nomic-embed-text + pgvector)
                  </h3>
                </div>
                <button
                  onClick={() => setRagDrawerOpen(false)}
                  className="rounded p-1 text-ink-500 hover:bg-surface-sunken"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Upload box */}
                <div className="rounded-md border border-dashed border-border-strong bg-surface-card p-3 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="rag-file-upload"
                  />
                  <label
                    htmlFor="rag-file-upload"
                    className="flex cursor-pointer flex-col items-center justify-center gap-1.5 py-2"
                  >
                    <Upload size={20} className="text-brand-700" />
                    <span className="text-xs font-medium text-ink-900">
                      Upload Document (PDF, TXT, MD)
                    </span>
                    <span className="text-[10px] text-ink-500">
                      Files are split into chunks & embedded via nomic-embed-text
                    </span>
                  </label>
                  {uploadingDoc && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-brand-700">
                      <RefreshCw size={12} className="animate-spin" /> Ingesting & embedding chunks…
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="mt-2 flex items-center justify-center gap-1 text-xs text-status-success">
                      <CheckCircle2 size={12} /> {uploadSuccess}
                    </div>
                  )}
                  {uploadError && (
                    <div className="mt-2 text-xs text-status-danger">
                      {uploadError}
                    </div>
                  )}
                </div>

                {/* Document List */}
                <div className="rounded-md border border-border bg-surface-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-ink-700">
                      Your Indexed Documents ({indexedDocs.length}):
                    </span>
                    <span className="text-[10px] text-ink-500">Click to view content</span>
                  </div>
                  {indexedDocs.length === 0 ? (
                    <p className="text-xs text-ink-500 py-3 text-center">No documents indexed yet. Upload one above!</p>
                  ) : (
                    <div className="max-h-36 space-y-1.5 overflow-y-auto">
                      {indexedDocs.map((doc, i) => (
                        <div
                          key={doc.document_id || i}
                          onClick={() => handleInspectDocument(doc)}
                          className="group flex items-center justify-between rounded bg-surface-sunken px-2.5 py-1.5 text-xs text-ink-900 transition-colors hover:bg-brand-100/60 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={13} className="text-brand-600 shrink-0" />
                            <span className="truncate font-medium">{doc.filename}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-ink-500 font-mono">
                              {doc.chunks} {doc.chunks === 1 ? 'chunk' : 'chunks'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectDocument(doc);
                              }}
                              className="rounded p-1 text-ink-500 hover:text-brand-800 hover:bg-white transition-colors"
                              title="Inspect document text and chunks"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteDocument(doc.document_id, e)}
                              className="rounded p-1 text-ink-500 hover:text-status-danger hover:bg-white transition-colors"
                              title="Delete from RAG store"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Content / Chunk Inspector Modal */}
        {inspectingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface-card shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-100 text-brand-800 shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="truncate">
                    <h3 className="text-sm font-bold text-ink-900 truncate">
                      {inspectingDoc.filename}
                    </h3>
                    <p className="text-[11px] text-ink-500">
                      {inspectingDoc.chunks?.length || 0} chunks indexed in RAG knowledge store
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyFullText}
                    className="flex items-center gap-1 rounded border border-border bg-surface-card px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-surface-sunken"
                    title="Copy full document text"
                  >
                    {docCopied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
                    <span>{docCopied ? 'Copied' : 'Copy Text'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(inspectingDoc.document_id)}
                    className="flex items-center gap-1 rounded border border-status-danger/30 bg-status-dangerBg/50 px-2.5 py-1 text-xs font-medium text-status-danger hover:bg-status-dangerBg"
                    title="Delete document"
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                  <button
                    onClick={() => setInspectingDoc(null)}
                    className="rounded p-1 text-ink-500 hover:bg-surface-sunken"
                    aria-label="Close viewer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Search & View Mode Toggle */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-sunken px-5 py-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input
                    value={chunkSearch}
                    onChange={(e) => setChunkSearch(e.target.value)}
                    placeholder="Search inside this document..."
                    className="w-full rounded border border-border bg-white pl-8 pr-3 py-1 text-xs text-ink-900 focus:border-brand-600 focus:outline-none"
                  />
                </div>
                <div className="flex items-center rounded border border-border bg-white p-0.5 text-xs">
                  <button
                    onClick={() => setViewMode('chunks')}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      viewMode === 'chunks'
                        ? 'bg-brand-800 text-white'
                        : 'text-ink-700 hover:bg-surface-sunken'
                    }`}
                  >
                    Chunks ({inspectingDoc.chunks?.length || 0})
                  </button>
                  <button
                    onClick={() => setViewMode('fulltext')}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      viewMode === 'fulltext'
                        ? 'bg-brand-800 text-white'
                        : 'text-ink-700 hover:bg-surface-sunken'
                    }`}
                  >
                    Full Text
                  </button>
                </div>
              </div>

              {/* Modal Content Body */}
              <div className="flex-1 overflow-y-auto p-5">
                {loadingDocChunks ? (
                  <LoadingState label="Loading document chunks..." />
                ) : viewMode === 'chunks' ? (
                  <div className="space-y-3">
                    {(inspectingDoc.chunks || [])
                      .filter(
                        (c) =>
                          !chunkSearch ||
                          c.content.toLowerCase().includes(chunkSearch.toLowerCase())
                      )
                      .map((chunk, idx) => (
                        <div
                          key={chunk.id || idx}
                          className="rounded-md border border-border bg-surface-card p-3 shadow-xs"
                        >
                          <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-500">
                            <span className="font-mono font-semibold text-brand-700">
                              Chunk #{idx + 1}
                            </span>
                            <span>{chunk.content.length} characters</span>
                          </div>
                          <p className="text-xs leading-relaxed text-ink-900 whitespace-pre-wrap">
                            {chunk.content}
                          </p>
                        </div>
                      ))}
                    {(inspectingDoc.chunks || []).filter(
                      (c) =>
                        !chunkSearch ||
                        c.content.toLowerCase().includes(chunkSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="py-8 text-center text-xs text-ink-500">
                        No matching chunks found for "{chunkSearch}".
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-surface-card p-4">
                    <p className="text-xs leading-relaxed text-ink-900 whitespace-pre-wrap font-mono">
                      {(inspectingDoc.chunks || []).map((c) => c.content).join('\n\n')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream Display Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          {isPersistent && active && (
            <section className="mx-auto mb-4 max-w-3xl rounded-lg border border-brand-200 bg-brand-100/35 px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-900">
                  <Link2 size={14} className="text-brand-700" />
                  Workspace context
                  <span className="font-normal text-ink-500">Documents and tasks stay available when you switch pages.</span>
                </div>
                {runningTasks.length > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-status-warning">
                    <RefreshCw size={12} className="animate-spin" /> {runningTasks[0].progress}% · {runningTasks[0].currentStep || 'Working'}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {workspaceDocuments.length === 0 ? (
                  <span className="text-[11px] text-ink-500">Attach a source document from RAG Docs to ground this conversation.</span>
                ) : workspaceDocuments.map((link) => (
                  <span key={link.id} className="rounded border border-border bg-white px-2 py-1 text-[11px] text-ink-700">
                    {link.role === 'SOURCE' ? 'Source' : link.role === 'WORKING' ? 'Working' : 'Generated'} · {link.document?.name}
                    {link.document?.versions?.[0] ? ` · v${link.document.versions[0].versionNumber}` : ''}
                  </span>
                ))}
              </div>
            </section>
          )}
          {loadingList ? (
            <LoadingState label="Loading chats…" />
          ) : !active || (active.messages || []).length === 0 ? (
            <div className="mx-auto max-w-lg py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-800 shadow-xs">
                <Bot size={24} />
              </div>
              <h2 className="text-base font-semibold text-ink-900">
                How can CoalGov Copilot help you today?
              </h2>
              <p className="mb-6 mt-1 text-xs text-ink-500">
                Mode:{' '}
                <strong className={isPersistent ? 'text-status-success' : 'text-status-warning'}>
                  {isPersistent ? 'Persistent (Saved)' : 'Once Chat (Temporary)'}
                </strong>
                . Upload a source document through RAG Docs to attach it to this workspace, then ask Copilot to analyze, generate, or revise a report.
              </p>
              <div className="flex flex-col gap-2">
                {CHAT_SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="rounded border border-border bg-surface-card px-3.5 py-2.5 text-left text-xs font-medium text-ink-700 shadow-xs transition-colors hover:border-brand-600 hover:text-brand-800"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {active.messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
              {error && (
                <div className="flex items-center gap-2 rounded border border-status-dangerBg bg-status-dangerBg px-3 py-2 text-xs text-status-danger">
                  <AlertTriangle size={13} /> {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 border-t border-border bg-surface-card p-4 shadow-sm"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isPersistent
                ? 'Ask Copilot (Saved to DB session)…'
                : 'Ask Copilot (Temporary session)…'
            }
            disabled={sending}
            className="flex-1 rounded border border-border-strong bg-surface-canvas px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-500/60 focus:border-brand-600 focus:bg-white focus:outline-none"
          />
          <Button type="submit" icon={Send} disabled={sending || !input.trim()}>
            {sending ? 'Streaming…' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
}
