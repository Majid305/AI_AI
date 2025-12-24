
import React, { useState, useEffect } from 'react';
import { Scanner } from './components/Scanner';
import { Dashboard } from './components/Dashboard';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';
import { ScreenName, DocumentData } from './types';
import { Camera, List, BarChart2, Settings as SettingsIcon, ShieldAlert, Bell } from 'lucide-react';

const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenName>('dashboard');
  const [editingDoc, setEditingDoc] = useState<DocumentData | null>(null);
  const [autoTriggerAI, setAutoTriggerAI] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const storedTheme = localStorage.getItem('THEME') as 'light' | 'dark';
    if (storedTheme) setTheme(storedTheme);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('THEME', theme);
  }, [theme]);

  const handleEdit = (doc: DocumentData, triggerAI = false) => {
      setEditingDoc(doc);
      setAutoTriggerAI(triggerAI);
      setScreen('scanner');
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-lavender dark:bg-slate-950 max-w-md mx-auto shadow-2xl overflow-hidden relative transition-colors">
        
        {/* Header Branding - Compacté */}
        <div className="bg-brand px-5 py-2.5 flex justify-between items-center shrink-0 shadow-md z-20">
            <div className="flex items-center gap-2">
                <ShieldAlert className="text-white" size={20} />
                <h1 className="text-white font-black text-lg tracking-tighter uppercase leading-none">Avisapp AI</h1>
            </div>
            <div className="bg-white/20 p-1.5 rounded-full relative">
                <Bell size={16} className="text-white" />
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-950">
            {screen === 'scanner' && (
                <Scanner 
                    onSave={() => { setScreen('dashboard'); setEditingDoc(null); setAutoTriggerAI(false); }}
                    onCancel={() => { setScreen('dashboard'); setEditingDoc(null); setAutoTriggerAI(false); }}
                    initialData={editingDoc}
                />
            )}
            {screen === 'dashboard' && <Dashboard onEdit={handleEdit} />}
            {screen === 'stats' && <Statistics />}
            {screen === 'settings' && (
                <Settings 
                    enableReminders={true}
                    setEnableReminders={() => {}}
                    theme={theme}
                    setTheme={setTheme}
                />
            )}
        </div>

        {/* Navigation - Uniformisée */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center z-50 shrink-0 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <button onClick={() => setScreen('dashboard')} className={`flex flex-col items-center transition-colors ${screen === 'dashboard' ? 'text-brand' : 'text-slate-300 hover:text-slate-400'}`}>
                <List size={26} strokeWidth={screen === 'dashboard' ? 3 : 2} />
            </button>
            
            <button 
                onClick={() => { setEditingDoc(null); setAutoTriggerAI(false); setScreen('scanner'); }}
                className={`flex flex-col items-center transition-colors ${screen === 'scanner' ? 'text-brand' : 'text-slate-300 hover:text-slate-400'}`}
            >
                <Camera size={26} strokeWidth={screen === 'scanner' ? 3 : 2} />
            </button>

            <button onClick={() => setScreen('stats')} className={`flex flex-col items-center transition-colors ${screen === 'stats' ? 'text-brand' : 'text-slate-300 hover:text-slate-400'}`}>
                <BarChart2 size={26} strokeWidth={screen === 'stats' ? 3 : 2} />
            </button>
            
            <button onClick={() => setScreen('settings')} className={`flex flex-col items-center transition-colors ${screen === 'settings' ? 'text-brand' : 'text-slate-300 hover:text-slate-400'}`}>
                <SettingsIcon size={26} strokeWidth={screen === 'settings' ? 3 : 2} />
            </button>
        </div>
    </div>
  );
};

export default App;
