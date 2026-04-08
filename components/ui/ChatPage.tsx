"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  chatApi,
  type ChatConversation,
  type ChatMessage,
  type ChatContact,
} from "@/lib/api/chat";
import { classApi } from "@/lib/api/class";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { errMsg } from "@/lib/utils/errMsg";
import {
  MessageSquare,
  Search,
  Send,
  Plus,
  ArrowLeft,
  Loader2,
  Users,
  ChevronDown,
} from "lucide-react";

// ─── Tick icon ────────────────────────────────────────────────────────────────

function TickIcon({ status }: { status: "sent" | "seen" }) {
  // "sent"  → double grey ticks (on primary-blue bubble: white/40)
  // "seen"  → double blue ticks (bright sky-blue that pops on the dark blue bubble)
  const stroke = status === "seen" ? "#93c5fd" : "rgba(255,255,255,0.45)";
  return (
    <svg
      width="18"
      height="11"
      viewBox="0 0 18 11"
      fill="none"
      className="inline-block shrink-0"
      aria-label={status === "seen" ? "Seen" : "Sent"}
    >
      {/* first check */}
      <path
        d="M1 5.5L4.5 9L10 2"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* second check — offset right */}
      <path
        d="M6 5.5L9.5 9L15 2"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    admin: "bg-primary/10 text-primary",
    lecturer: "bg-meta-5/10 text-meta-5",
    student: "bg-meta-3/10 text-meta-3",
    parent: "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-400",
  };
  return map[role] ?? "bg-stroke text-body";
}

function Avatar({
  name,
  photo,
  size = "md",
  isGroup = false,
}: {
  name: string;
  photo?: string;
  size?: "sm" | "md" | "lg";
  isGroup?: boolean;
}) {
  const sizeClass =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
      ? "h-11 w-11 text-base"
      : "h-9 w-9 text-sm";

  if (isGroup) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-full bg-meta-5 flex items-center justify-center`}
      >
        <Users className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} color="white" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 rounded-full bg-primary overflow-hidden flex items-center justify-center font-bold uppercase text-white`}
    >
      {photo ? (
        <Image
          src={photo}
          alt={name}
          width={44}
          height={44}
          className="h-full w-full object-cover"
        />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
}

// ─── New direct-message modal ─────────────────────────────────────────────────

function NewConversationModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (userId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["chat-contacts"],
    queryFn: chatApi.getContacts,
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = (contacts as ChatContact[]).filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="new-msg-title"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        className="w-full max-w-md rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
          <h3 id="new-msg-title" className="text-base font-semibold text-black dark:text-white">New Message</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
            <input
              autoFocus
              placeholder="Search by name or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-body" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-body">No contacts found.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-stroke dark:divide-strokedark">
              {filtered.map((c) => (
                <li key={c._id}>
                  <button
                    onClick={() => {
                      onStart(c._id);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 px-2 py-2.5 hover:bg-whiter transition-colors dark:hover:bg-meta-4 rounded"
                  >
                    <Avatar name={c.fullName} photo={c.profilePhoto} />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-black dark:text-white">
                        {c.fullName}
                      </p>
                      <p className="truncate text-xs text-body">{c.email}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${roleBadge(c.role)}`}
                    >
                      {c.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New group chat modal (lecturer only) ─────────────────────────────────────

function NewGroupModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, participantIds: string[]) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [error, setError] = useState("");
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data: classes = [] } = useQuery({
    queryKey: ["lecturer-classes"],
    queryFn: classApi.getForLecturer,
  });

  const { data: classStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["class-students", selectedClass],
    queryFn: () => classApi.getStudents(selectedClass),
    enabled: !!selectedClass,
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["chat-contacts"],
    queryFn: chatApi.getContacts,
  });

  // Auto-select all students when a class is chosen
  useEffect(() => {
    if (!selectedClass) return;
    const ids = (classStudents as { _id: string }[]).map((s) => s._id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set(ids));
  }, [classStudents, selectedClass]);

  const filteredContacts = (contacts as ChatContact[]).filter(
    (c) =>
      c.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.role.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!groupName.trim()) { setError("Group name is required"); return; }
    if (selected.size === 0) { setError("Select at least one participant"); return; }
    onCreate(groupName.trim(), [...selected]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="new-group-title"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        className="w-full max-w-md rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark shrink-0">
          <h3 id="new-group-title" className="text-base font-semibold text-black dark:text-white">New Group Chat</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">
              Group Name
            </label>
            <input
              autoFocus
              placeholder="e.g. Class 10A – Maths"
              value={groupName}
              onChange={(e) => { setGroupName(e.target.value); setError(""); }}
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
          </div>

          {/* Class picker shortcut */}
          {(classes as { _id: string; name: string }[]).length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">
                Load from class (optional)
              </label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="h-9 w-full appearance-none rounded border border-stroke bg-transparent px-3 pr-8 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                >
                  <option value="">— pick a class —</option>
                  {(classes as { _id: string; name: string }[]).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
              </div>
              {studentsLoading && (
                <p className="mt-1 text-xs text-body flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading students…
                </p>
              )}
            </div>
          )}

          {/* Contact picker */}
          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">
              Participants{" "}
              {selected.size > 0 && (
                <span className="text-body">({selected.size} selected)</span>
              )}
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-body" />
              <input
                placeholder="Search contacts…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="h-8 w-full rounded border border-stroke bg-transparent pl-8 pr-3 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
            </div>
            {contactsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-body" />
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto divide-y divide-stroke dark:divide-strokedark rounded border border-stroke dark:border-strokedark">
                {filteredContacts.map((c) => (
                  <li key={c._id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-whiter dark:hover:bg-meta-4">
                      <input
                        type="checkbox"
                        checked={selected.has(c._id)}
                        onChange={() => toggle(c._id)}
                        className="h-4 w-4 accent-primary"
                      />
                      <Avatar name={c.fullName} photo={c.profilePhoto} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-black dark:text-white">
                          {c.fullName}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${roleBadge(c.role)}`}
                      >
                        {c.role}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-xs text-meta-1">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-stroke px-5 py-3 dark:border-strokedark flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-body hover:bg-stroke transition-colors dark:hover:bg-meta-4"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message thread ───────────────────────────────────────────────────────────

function MessageThread({
  conversation,
  currentUserId,
  onBack,
}: {
  conversation: ChatConversation;
  currentUserId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingRef = useRef(false);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", conversation._id],
    queryFn: () => chatApi.getMessages(conversation._id),
    // No polling — socket delivers new messages
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(conversation._id, content),
    onSuccess: (newMsg) => {
      queryClient.setQueryData(
        ["chat-messages", conversation._id],
        (old: ChatMessage[] = []) => [...old, newMsg]
      );
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setInput("");
      setSendError("");
    },
    onError: (err) => setSendError(errMsg(err, "Failed to send message")),
  });

  // Mark read when opened
  useEffect(() => {
    chatApi.markRead(conversation._id).then(() => {
      queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });
    });
  }, [conversation._id, queryClient]);

  // Socket: join/leave conversation room + listen for new messages + typing
  useEffect(() => {
    if (!socket) return;
    socket.emit("join_conversation", conversation._id);

    const onNewMessage = (payload: { conversationId: string; message: ChatMessage }) => {
      if (payload.conversationId !== conversation._id) return;
      // Own messages are already added by sendMutation.onSuccess — skip to avoid duplicates
      if (payload.message.sender._id === currentUserId) return;
      queryClient.setQueryData(
        ["chat-messages", conversation._id],
        (old: ChatMessage[] = []) => {
          if (old.some((m) => m._id === payload.message._id)) return old;
          return [...old, payload.message];
        }
      );
      // Auto-mark read since this thread is open
      chatApi.markRead(conversation._id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });
      });
    };

    const onTyping = (payload: { userId: string; name: string; conversationId: string }) => {
      if (payload.conversationId !== conversation._id) return;
      if (payload.userId === currentUserId) return;
      setTypingUsers((prev) =>
        prev.includes(payload.name) ? prev : [...prev, payload.name]
      );
      clearTimeout(typingTimers.current[payload.userId]);
      typingTimers.current[payload.userId] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== payload.name));
      }, 3000);
    };

    const onTypingStop = (payload: { userId: string; conversationId: string }) => {
      if (payload.conversationId !== conversation._id) return;
      setTypingUsers([]);
    };

    const onMessagesRead = (payload: { conversationId: string; readBy: string }) => {
      if (payload.conversationId !== conversation._id) return;
      // Update readBy on all messages in this thread so ticks turn blue
      queryClient.setQueryData(
        ["chat-messages", conversation._id],
        (old: ChatMessage[] = []) =>
          old.map((m) =>
            m.readBy.includes(payload.readBy)
              ? m
              : { ...m, readBy: [...m.readBy, payload.readBy] }
          )
      );
    };

    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("typing_stop", onTypingStop);
    socket.on("messages_read", onMessagesRead);

    return () => {
      socket.emit("leave_conversation", conversation._id);
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("typing_stop", onTypingStop);
      socket.off("messages_read", onMessagesRead);
    };
  }, [socket, conversation._id, currentUserId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  }, [input, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Emit typing events with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!socket) return;
    if (!typingRef.current) {
      typingRef.current = true;
      socket.emit("typing_start", { conversationId: conversation._id });
    }
    clearTimeout(typingTimers.current["self"]);
    typingTimers.current["self"] = setTimeout(() => {
      typingRef.current = false;
      socket.emit("typing_stop", { conversationId: conversation._id });
    }, 2000);
  };

  const isGroup = conversation.type === "group";
  const other = !isGroup
    ? conversation.participants.find((p) => p._id !== currentUserId)
    : null;
  const displayName = isGroup
    ? conversation.name ?? "Group"
    : other?.fullName ?? "Unknown";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stroke px-4 py-3 dark:border-strokedark">
        <button
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-stroke transition-colors dark:hover:bg-meta-4 lg:hidden"
        >
          <ArrowLeft className="h-4 w-4 text-body" />
        </button>
        <Avatar name={displayName} photo={other?.profilePhoto} isGroup={isGroup} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-black dark:text-white">{displayName}</p>
          {isGroup ? (
            <p className="text-xs text-body">
              {conversation.participants.length} members
            </p>
          ) : (
            <p className="text-xs capitalize text-body">{other?.role}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-body" />
          </div>
        ) : (messages as ChatMessage[]).length === 0 ? (
          <p className="text-center text-sm text-body py-10">No messages yet. Say hello!</p>
        ) : (
          (messages as ChatMessage[]).map((msg) => {
            const isMe = msg.sender._id === currentUserId;
            return (
              <div
                key={msg._id}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                {!isMe && (
                  <Avatar name={msg.sender.fullName} photo={msg.sender.profilePhoto} size="sm" />
                )}
                <div
                  className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    isMe
                      ? "rounded-br-sm bg-primary text-white"
                      : "rounded-bl-sm bg-stroke text-black dark:bg-meta-4 dark:text-white"
                  }`}
                >
                  {/* Show sender name in group chats for non-self messages */}
                  {isGroup && !isMe && (
                    <p className="mb-0.5 text-[10px] font-semibold opacity-70">
                      {msg.sender.fullName}
                    </p>
                  )}
                  {msg.content}
                  <span
                    className={`mt-0.5 flex items-center gap-1 text-[10px] ${isMe ? "justify-end text-white/60" : "text-body"}`}
                  >
                    {formatTime(msg.createdAt)}
                    {isMe && (
                      <TickIcon
                        status={
                          msg.readBy.some((id) => id !== currentUserId)
                            ? "seen"
                            : "sent"
                        }
                      />
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="rounded-2xl rounded-bl-sm bg-stroke px-3.5 py-2 dark:bg-meta-4">
              <p className="text-xs text-body italic">
                {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
              </p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-stroke px-4 py-3 dark:border-strokedark">
        {sendError && <p className="mb-2 text-xs text-meta-1">{sendError}</p>}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            placeholder="Type a message… (Enter to send)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none rounded-xl border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            style={{ maxHeight: "120px" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-opacity disabled:opacity-40 hover:bg-primary/90"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation list ────────────────────────────────────────────────────────

function ConversationList({
  conversations,
  activeId,
  currentUserId,
  search,
  onSearch,
  onSelect,
  onNewChat,
  onNewGroup,
  isLoading,
  isLecturer,
}: {
  conversations: ChatConversation[];
  activeId: string | null;
  currentUserId: string;
  search: string;
  onSearch: (s: string) => void;
  onSelect: (conv: ChatConversation) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  isLoading: boolean;
  isLecturer: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const filtered = conversations.filter((conv) => {
    if (!search) return true;
    if (conv.type === "group") {
      return conv.name?.toLowerCase().includes(search.toLowerCase());
    }
    const other = conv.participants.find((p) => p._id !== currentUserId);
    return other?.fullName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col border-r border-stroke dark:border-strokedark">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
        <h2 className="text-sm font-semibold text-black dark:text-white">Messages</h2>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => (isLecturer ? setShowMenu((v) => !v) : onNewChat())}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
            title={isLecturer ? "New conversation or group" : "New conversation"}
          >
            <Plus className="h-4 w-4" />
          </button>
          {isLecturer && showMenu && (
            <div className="absolute right-0 top-9 z-10 w-44 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <button
                onClick={() => { setShowMenu(false); onNewChat(); }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-black hover:bg-whiter dark:text-white dark:hover:bg-meta-4"
              >
                <MessageSquare className="h-4 w-4" />
                Direct Message
              </button>
              <button
                onClick={() => { setShowMenu(false); onNewGroup(); }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-black hover:bg-whiter dark:text-white dark:hover:bg-meta-4"
              >
                <Users className="h-4 w-4" />
                New Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-body" />
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="h-8 w-full rounded-lg border border-stroke bg-transparent pl-8 pr-3 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-body" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
            <MessageSquare className="h-8 w-8 text-body" />
            <p className="text-sm text-body">
              {search ? "No conversations match your search." : "No conversations yet."}
            </p>
            {!search && (
              <button
                onClick={onNewChat}
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                Start a new conversation
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-stroke dark:divide-strokedark">
            {filtered.map((conv) => {
              const isGroup = conv.type === "group";
              const other = !isGroup
                ? conv.participants.find((p) => p._id !== currentUserId)
                : null;
              const displayName = isGroup
                ? conv.name ?? "Group"
                : other?.fullName ?? "Unknown";
              const isActive = conv._id === activeId;

              return (
                <li key={conv._id}>
                  <button
                    onClick={() => onSelect(conv)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-whiter dark:hover:bg-meta-4 ${
                      isActive ? "bg-whiter dark:bg-meta-4" : ""
                    }`}
                  >
                    <Avatar
                      name={displayName}
                      photo={other?.profilePhoto}
                      isGroup={isGroup}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-sm font-medium text-black dark:text-white">
                          {displayName}
                        </p>
                        {conv.lastMessageAt && (
                          <span className="shrink-0 text-[10px] text-body">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-body">
                        {conv.lastMessage
                          ? isGroup
                            ? `${conv.lastMessage.sender.fullName}: ${conv.lastMessage.content}`
                            : conv.lastMessage.content
                          : isGroup
                          ? `${conv.participants.length} members`
                          : "No messages yet"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user, isRole } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: chatApi.getConversations,
    // Keep a fallback interval in case socket is disconnected
    refetchInterval: 30_000,
  });

  // Socket: listen for conversation_updated to refresh the list
  useEffect(() => {
    if (!socket) return;
    const onConversationUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });
    };
    socket.on("conversation_updated", onConversationUpdated);
    return () => { socket.off("conversation_updated", onConversationUpdated); };
  }, [socket, queryClient]);



  const startMutation = useMutation({
    mutationFn: chatApi.getOrCreateConversation,
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setActiveConversation(conv);
      setMobileView("thread");
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: ({ name, participantIds }: { name: string; participantIds: string[] }) =>
      chatApi.createGroupConversation(name, participantIds),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setActiveConversation(conv);
      setMobileView("thread");
    },
  });

  const handleSelectConversation = (conv: ChatConversation) => {
    setActiveConversation(conv);
    setMobileView("thread");
  };

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      {/* Conversation list — hidden on mobile when thread is open */}
      <div
        className={`w-full shrink-0 lg:w-80 xl:w-96 ${
          mobileView === "thread" ? "hidden lg:flex" : "flex"
        } flex-col`}
      >
        <ConversationList
          conversations={conversations as ChatConversation[]}
          activeId={activeConversation?._id ?? null}
          currentUserId={user._id}
          search={listSearch}
          onSearch={setListSearch}
          onSelect={handleSelectConversation}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
          isLoading={isLoading}
          isLecturer={isRole("lecturer")}
        />
      </div>

      {/* Thread panel */}
      <div
        className={`flex-1 ${mobileView === "list" ? "hidden lg:flex" : "flex"} flex-col`}
      >
        {activeConversation ? (
          <MessageThread
            conversation={activeConversation}
            currentUserId={user._id}
            onBack={() => setMobileView("list")}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
            <MessageSquare className="h-12 w-12 text-stroke" />
            <p className="text-sm font-medium text-black dark:text-white">
              Select a conversation
            </p>
            <p className="text-xs text-body">
              Choose from the list or start a new conversation.
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              New Message
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewChat && (
        <NewConversationModal
          onClose={() => setShowNewChat(false)}
          onStart={(userId) => startMutation.mutate(userId)}
        />
      )}
      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onCreate={(name, participantIds) =>
            createGroupMutation.mutate({ name, participantIds })
          }
        />
      )}
    </div>
  );
}
