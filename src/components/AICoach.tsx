import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { WorkoutRow } from '../types';
import { Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';

interface Props {
  sessionData: WorkoutRow[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AICoach: React.FC<Props> = ({ sessionData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // If session changes, clear chat or add a system note? Let's just keep it persistent per session ideally, 
  // but for simplicity, we reset if data is totally different. 
  // Actually, let's just keep the chat history as is, but inject context on each send.

  const handleSend = async () => {
    if (!input.trim() || !process.env.API_KEY) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Construct context from session data
      const context = sessionData.map(e => 
        `- ${e.exercice} (${e.series} sets x ${e.repsDuree}, Rest: ${e.repos}s, Tempo/RPE: ${e.tempoRpe}). Notes: ${e.notes}`
      ).join('\n');

      const prompt = `
        You are an elite sports performance coach. 
        Here is the current workout session data the user is looking at:
        ${context}

        User Question: ${userMsg}

        Answer concisely, professionally, and focusing on performance, safety, and physiology.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text;
      if (text) {
        setMessages(prev => [...prev, { role: 'model', text }]);
      }
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to the coaching server right now. Please check your API key." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-lg shadow-emerald-900/50 transition-all duration-300 flex items-center gap-2 group z-50"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="font-semibold pr-1">AI Coach</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-10 fade-in duration-300" style={{ height: '500px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 rounded-t-2xl">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <Bot className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
                <h3 className="font-bold text-slate-100 text-sm">ProTrack Coach</h3>
                <p className="text-xs text-slate-400">Powered by Gemini 2.5</p>
            </div>
        </div>
        <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-2"
        >
            ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
        {messages.length === 0 && (
            <div className="text-center text-slate-500 mt-10">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Ask me about form, warmups, or intensity for this session.</p>
            </div>
        )}
        {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                    m.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-none' 
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}>
                    {m.text}
                </div>
            </div>
        ))}
        {loading && (
            <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-bl-none p-3 border border-slate-700">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800 bg-slate-900 rounded-b-2xl">
        <div className="relative flex items-center">
            <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 placeholder:text-slate-600"
                placeholder="Ask about this workout..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={loading}
            />
            <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-2 p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
        {!process.env.API_KEY && (
             <p className="text-[10px] text-red-400 mt-2 text-center">API Key missing in environment.</p>
        )}
      </div>
    </div>
  );
};