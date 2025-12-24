
import React, { useState, useEffect } from 'react';
// Added ShieldAlert to imports
import { Database, Download, UploadCloud, Loader2, Moon, Sun, Bell, Lock, ShieldCheck, Lightbulb, ExternalLink, Key, CheckCircle2, AlertCircle, RefreshCw, FileJson, Server, ShieldAlert } from 'lucide-react';
import { getAllDocuments, restoreBackup } from '../services/db';
import { DocumentData } from '../types';

interface SettingsProps {
    enableReminders: boolean;
    setEnableReminders: (val: boolean) => void;
    theme: 'light' | 'dark';
    setTheme: (t: 'light' | 'dark') => void;
}

export const Settings: React.FC<SettingsProps> = ({ enableReminders, setEnableReminders, theme, setTheme }) => {
    const [isRestoring, setIsRestoring] = useState(false);
    const [apiKeyStatus, setApiKeyStatus] = useState<'NONE' | 'STUDIO' | 'ENV'>('NONE');
    
    useEffect(() => {
        checkApiKeyStatus();
    }, []);

    const checkApiKeyStatus = async () => {
        // 1. Vérifier si on est dans l'environnement AI Studio avec le bridge
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
            const hasStudioKey = await aistudio.hasSelectedApiKey();
            if (hasStudioKey) {
                setApiKeyStatus('STUDIO');
                return;
            }
        }

        // 2. Vérifier si une clé est injectée via l'environnement (Vercel / Cloud)
        if (process.env.API_KEY && process.env.API_KEY !== "") {
            setApiKeyStatus('ENV');
        } else {
            setApiKeyStatus('NONE');
        }
    };

    const handleSelectKey = async () => {
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.openSelectKey === 'function') {
            try {
                await aistudio.openSelectKey();
                setApiKeyStatus('STUDIO');
            } catch (err) {
                console.error("Erreur sélection clé", err);
            }
        } else {
            alert("Note : Vous êtes dans un environnement indépendant (Vercel). La clé doit être configurée dans les variables d'environnement de votre hébergeur sous le nom 'API_KEY'.");
        }
    };

    const handleExport = async () => {
        try {
            const docs = await getAllDocuments();
            if (docs.length === 0) {
                alert("Aucune donnée à sauvegarder.");
                return;
            }
            const blob = new Blob([JSON.stringify(docs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `avisapp_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("Erreur lors de l'exportation.");
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm(`Restaurer le fichier "${file.name}" ?\nLes données seront fusionnées avec l'existant.`)) {
            e.target.value = "";
            return;
        }

        setIsRestoring(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = event.target?.result as string;
                const data = JSON.parse(json);
                if (!Array.isArray(data)) throw new Error("Format invalide.");
                const count = await restoreBackup(data);
                alert(`${count} dossiers importés avec succès.`);
                window.location.reload();
            } catch (err) {
                alert("Erreur lors de l'importation. Fichier corrompu ?");
            } finally {
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };
    
    return (
        <div className="h-full bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto transition-colors duration-300 pb-32">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-8 tracking-tight uppercase">Paramètres</h2>
            
            {isRestoring && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <Loader2 size={48} className="animate-spin mb-4 text-[#0ABAB5]" />
                    <p className="font-bold text-xl uppercase tracking-widest text-center px-6">Restauration en cours...</p>
                </div>
            )}

            {/* SECTION IA */}
            <div className="bg-[#020617] rounded-[2.5rem] border border-slate-800 p-8 mb-8 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                    <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
                        <Lock className="text-[#0ABAB5]" size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[#0ABAB5] uppercase tracking-tighter leading-none">IA & Sécurité</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configuration Gemini</p>
                    </div>
                </div>

                <div className={`mb-8 p-6 rounded-3xl border-2 flex items-center justify-between transition-all ${apiKeyStatus !== 'NONE' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${apiKeyStatus !== 'NONE' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            {apiKeyStatus !== 'NONE' ? <CheckCircle2 className="text-emerald-500" size={24} /> : <AlertCircle className="text-red-500" size={24} />}
                        </div>
                        <div>
                            <span className={`block text-[10px] font-black uppercase tracking-widest ${apiKeyStatus !== 'NONE' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {apiKeyStatus === 'STUDIO' ? "Connecté (AI Studio)" : apiKeyStatus === 'ENV' ? "Connecté (Environnement)" : "Non configuré"}
                            </span>
                            <span className="text-sm font-bold text-white">
                                {apiKeyStatus !== 'NONE' ? "Prêt pour l'analyse" : "Action requise"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {(window as any).aistudio ? (
                        <button 
                            onClick={handleSelectKey}
                            className="w-full bg-[#0ABAB5] hover:bg-[#099994] text-slate-950 py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(10,186,181,0.2)] active:scale-[0.98] transition-all"
                        >
                            <Key size={18} />
                            {apiKeyStatus === 'STUDIO' ? "Changer de Projet" : "Sélecteur de clé"}
                        </button>
                    ) : (
                        <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="flex items-start gap-3">
                                <Server size={18} className="text-blue-400 shrink-0 mt-1" />
                                <div>
                                    <p className="text-xs text-white font-bold uppercase mb-1">Mode Cloud (Vercel)</p>
                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                        Sur cet environnement, la clé API doit être définie via les variables d'environnement de votre hébergeur (API_KEY).
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* PREFERENCES SECTION */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 space-y-6 mb-8">
                <div className="flex items-center space-x-2 text-brand">
                    <Bell size={24} />
                    <h3 className="font-black text-lg uppercase tracking-tight">Interface</h3>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-200 text-sm font-bold">Mode Sombre</span>
                    <button 
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ${theme === 'dark' ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-7' : ''}`}></div>
                    </button>
                </div>
            </div>

            {/* DATA SECTION - VISIBILITÉ ACCRUE */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border-2 border-[#0ABAB5]/20 p-8 space-y-6">
                <div className="flex items-center space-x-2 text-[#0ABAB5]">
                    <Database size={28} />
                    <h3 className="font-black text-xl uppercase tracking-tight">Ma Base de Données</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    <button 
                        onClick={handleExport}
                        className="w-full bg-slate-950 text-white font-black py-5 rounded-2xl shadow-lg flex justify-center items-center gap-3 text-sm uppercase tracking-widest hover:bg-[#0ABAB5] hover:text-slate-950 transition-all active:scale-[0.98]"
                    >
                        <Download size={20} />
                        <span>Exporter tout (.JSON)</span>
                    </button>

                    <label className="w-full bg-slate-50 dark:bg-slate-950 border-3 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 font-black py-5 rounded-2xl flex justify-center items-center gap-3 text-sm uppercase tracking-widest cursor-pointer hover:border-[#0ABAB5] transition-all group">
                        <UploadCloud size={20} className="group-hover:text-[#0ABAB5]" />
                        <span>Importer dossiers</span>
                        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                    </label>
                </div>
                
                <div className="flex items-center gap-2 justify-center py-2">
                    <ShieldAlert size={14} className="text-amber-500" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                        Vos données ne quittent jamais cet appareil.
                    </p>
                </div>
            </div>

            <div className="mt-12 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Avisapp AI • v1.2.4</p>
            </div>
        </div>
    );
};
