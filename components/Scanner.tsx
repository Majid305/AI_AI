
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, Save, RefreshCw, Wand2, Paperclip, X, FileText, ShieldAlert, Sparkles, BellRing, MapPin, Calendar, Hash, Tag, Clock, CalendarDays, Timer } from 'lucide-react';
import { DocumentData, DocStatus, IncidentType } from '../types';
import { analyzeIncident } from '../services/geminiService';
import { saveDocument, getAllDocuments } from '../services/db';

interface ScannerProps {
  onSave: () => void;
  onCancel: () => void;
  initialData?: DocumentData | null;
}

export const Scanner: React.FC<ScannerProps> = ({ onSave, onCancel, initialData }) => {
  const [fileData, setFileData] = useState<string | null>(initialData?.document_image || null);
  const [mimeType, setMimeType] = useState<string>(initialData?.mimeType || "image/jpeg");
  const [auxImages, setAuxImages] = useState<string[]>(initialData?.aux_images || []);
  const [userText, setUserText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [showForm, setShowForm] = useState(!!initialData);

  const [formData, setFormData] = useState<Partial<DocumentData> | null>(initialData || {
    id: "Génération...",
    fait_a: "Tahannaout",
    fait_le: new Date().toISOString().split('T')[0],
    statut: DocStatus.SUIVRE,
    nature_incident: IncidentType.AUTRE,
    date_iso: new Date().toISOString().split('T')[0],
    rappel_details: "",
    rappel_date: ""
  });

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auxInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isNewOrDuplicate = !initialData || !initialData.id || initialData.id === "" || initialData.id.startsWith("TEMP_");
    if (isNewOrDuplicate && showForm) {
      updateAutomaticId();
    }
  }, [formData?.date_iso, showForm]);

  const updateAutomaticId = async () => {
    const dateStr = formData?.date_iso || new Date().toISOString().split('T')[0];
    const nextId = await calculateNextSRMId(dateStr);
    setFormData(prev => prev ? { ...prev, id: nextId } : null);
  };

  const calculateNextSRMId = async (dateIso: string) => {
    try {
      let date = new Date(dateIso);
      if (isNaN(date.getTime())) date = new Date();

      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const mmYY = `${month}${year}`;
      const prefix = `SRM-MS/DPH/AI-${mmYY}`;
      
      const docs = await getAllDocuments();
      const monthlyDocs = docs.filter(d => d.id && d.id.startsWith(prefix));
      
      let maxN = 0;
      monthlyDocs.forEach(doc => {
        const nPart = doc.id.substring(prefix.length);
        const n = parseInt(nPart, 10);
        if (!isNaN(n) && n > maxN) maxN = n;
      });

      return `${prefix}${maxN + 1}`;
    } catch (e) {
      console.error("Erreur calcul ID", e);
      return `SRM-MS/DPH/AI-${new Date().getTime()}`;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => setFileData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAuxImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && auxImages.length < 3) {
      const reader = new FileReader();
      reader.onloadend = () => setAuxImages([...auxImages, reader.result as string]);
      reader.readAsDataURL(file);
    }
  };

  const performAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeIncident(fileData, mimeType, userText);
      setFormData(prev => ({ 
        ...prev, 
        ...result,
        id: prev?.id && prev.id !== "Génération..." ? prev.id : "Génération...",
        fait_a: prev?.fait_a || "Tahannaout",
        fait_le: result.fait_le || prev?.fait_le || new Date().toISOString().split('T')[0],
        date_iso: result.date_iso || prev?.date_iso
      }));
      setShowForm(true);
    } catch (err: any) {
      alert(`Erreur IA : ${err?.message}`);
      setShowForm(true); 
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!formData || !formData.id || formData.id === "Génération...") {
       alert("Le numéro d'avis n'a pas pu être généré.");
       return;
    }
    setLoading(true);
    try {
      const finalDoc: DocumentData = {
        ...(formData as DocumentData),
        id: formData.id,
        document_image: fileData || "",
        mimeType: mimeType || "",
        aux_images: auxImages,
        statut: formData.statut || DocStatus.SUIVRE,
        rappel_actif: (formData.statut !== DocStatus.CLASSER) || !!formData.rappel_date || !!formData.rappel_details,
        rappel_date: formData.rappel_date || "",
        rappel_details: formData.rappel_details || "",
        fait_a: formData.fait_a || "Tahannaout",
        fait_le: formData.fait_le || new Date().toISOString().split('T')[0],
        created_at: initialData?.created_at && !initialData.id.startsWith("TEMP") ? initialData.created_at : Date.now()
      };

      await saveDocument(finalDoc);
      onSave();
    } catch (e) {
      alert("Erreur de sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  if (!showForm && !analyzing) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950 p-5 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6 mt-1">
          <ShieldAlert size={32} className="text-brand shrink-0" />
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nouvel Avis</h2>
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center justify-center bg-brand text-white p-5 rounded-[1.5rem] shadow-lg active:scale-95 transition-all">
               <Camera size={24} />
               <span className="text-[9px] font-black mt-2 uppercase tracking-widest">Appareil Photo</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center bg-blue-600 text-white p-5 rounded-[1.5rem] shadow-lg active:scale-95 transition-all">
              <Upload size={24} />
              <span className="text-[9px] font-black mt-2 uppercase tracking-widest">Importer</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes ou Description (IA)</label>
            <textarea 
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm border-2 border-transparent focus:border-brand outline-none transition-all dark:text-white font-medium"
              placeholder="Décrivez l'incident pour l'IA..."
              rows={3}
              value={userText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserText(e.target.value)}
            />
          </div>
          
          {fileData && (
            <div className="flex items-center gap-3 bg-brand/5 dark:bg-brand/10 p-3 rounded-xl border-2 border-dashed border-brand/20">
              <FileText size={18} className="text-brand" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate flex-1">{mimeType.includes('pdf') ? 'Fichier PDF' : 'Image prête'}</span>
              <button onClick={() => { setFileData(null); setMimeType(""); }} className="bg-red-50 dark:bg-red-900/20 p-1 rounded-lg"><X size={14} className="text-red-500" /></button>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-auto">
            <button 
              onClick={performAnalysis}
              disabled={!fileData && !userText.trim()}
              className="w-full bg-brand text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-xl disabled:opacity-30 active:scale-95 transition-all"
            >
              <Wand2 size={18} /> ANALYSER AVEC L'IA
            </button>
            <button onClick={() => setShowForm(true)} className="w-full bg-slate-100 dark:bg-slate-900 text-slate-500 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest">Saisie Manuelle</button>
          </div>
        </div>
        <button onClick={onCancel} className="mt-4 text-slate-400 font-black text-[9px] uppercase tracking-widest text-center">Annuler</button>
        <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} />
        <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 bg-white dark:bg-slate-950 p-10 text-center">
        <Loader2 size={64} className="text-brand animate-spin" />
        <p className="font-black text-brand uppercase tracking-widest animate-pulse">Analyse IA en cours...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 relative">
      <div className="flex-1 overflow-y-auto pb-36">
        <div className="p-4 space-y-8">
          <section className="space-y-4">
            <h4 className="text-xs font-black text-brand uppercase tracking-widest border-b-2 border-brand/10 pb-1">1. AVIS D'INCIDENT</h4>
            
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border-2 border-brand/20 shadow-sm">
              <label className="block text-[9px] font-black text-brand uppercase mb-1 tracking-widest">Numéro d'Avis Officiel</label>
              <input className="w-full bg-transparent font-black text-slate-900 dark:text-white text-base outline-none" value={formData?.id || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, id: e.target.value})} />
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-2 mb-1">
                <Tag size={12} className="text-brand" />
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Nature d'incident</label>
              </div>
              <select 
                className="w-full bg-transparent font-black outline-none dark:text-white text-sm appearance-none relative z-10" 
                value={formData?.nature_incident || IncidentType.AUTRE} 
                onChange={(e) => setFormData({...formData, nature_incident: e.target.value as IncidentType})}
              >
                {Object.values(IncidentType).map(type => (
                  <option key={type} value={type} className="dark:bg-slate-900">{type}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">▼</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-[2rem] border border-blue-200 dark:border-blue-800 shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <CalendarDays size={20} className="text-blue-600 dark:text-blue-400" />
                <label className="block text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">Date du Sinistre</label>
              </div>
              <div className="relative group">
                <input 
                  type="date"
                  className="w-full bg-white dark:bg-slate-950 p-4 rounded-2xl font-black outline-none dark:text-white text-sm border-2 border-blue-100 dark:border-blue-900 focus:border-blue-500 transition-all text-center" 
                  value={formData?.date_iso || ""} 
                  onChange={(e) => setFormData({...formData, date_iso: e.target.value})} 
                />
              </div>
            </div>
            
            <Field label="Victime ou objet du sinistre" value={formData?.victime_objet} onChange={(v: string) => setFormData({...formData, victime_objet: v})} />
            <Field label="Description du sinistre" value={formData?.description_sinistre} onChange={(v: string) => setFormData({...formData, description_sinistre: v})} />
            <Field label="Lieu, date et heure du sinistre" value={formData?.lieu_date_heure} onChange={(v: string) => setFormData({...formData, lieu_date_heure: v})} />
            <Field label="Dommages (nature et évaluation)" value={formData?.dommages} onChange={(v: string) => setFormData({...formData, dommages: v})} />
            
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Causes et circonstances</label>
              <textarea className="w-full bg-transparent font-bold outline-none dark:text-white text-xs mb-4" rows={4} value={formData?.causes_circonstances || ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, causes_circonstances: e.target.value})} />
              <div className="flex gap-2 overflow-x-auto pb-2">
                {auxImages.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-lg">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setAuxImages(auxImages.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-xl shadow-xl"><X size={14}/></button>
                  </div>
                ))}
                {auxImages.length < 3 && (
                  <button onClick={() => auxInputRef.current?.click()} className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-300 gap-1 hover:border-brand/50 transition-all">
                    <Camera size={24}/>
                    <span className="text-[8px] font-black uppercase">Ajouter</span>
                  </button>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" ref={auxInputRef} onChange={handleAuxImage} />
            </div>

            <Field label="Responsabilités" value={formData?.responsabilites} onChange={(v: string) => setFormData({...formData, responsabilites: v})} />
            <Field label="Mesures prises" value={formData?.mesures_prises} onChange={(v: string) => setFormData({...formData, mesures_prises: v})} />
            <Field label="Références autorites" value={formData?.references_autorites} onChange={(v: string) => setFormData({...formData, references_autorites: v})} />
            <Field label="Observations" value={formData?.observations} onChange={(v: string) => setFormData({...formData, observations: v})} />
            
            <div className="grid grid-cols-1 gap-4 bg-slate-100 dark:bg-slate-900/50 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800">
               <Field icon={<MapPin size={14} className="text-orange-600"/>} label="Fait à :" value={formData?.fait_a} onChange={(v: string) => setFormData({...formData, fait_a: v})} />
               
               <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-orange-200 dark:border-orange-900 shadow-sm relative group transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-orange-600" />
                    <label className="block text-[9px] font-black text-orange-700 dark:text-orange-300 uppercase tracking-widest">Fait le :</label>
                  </div>
                  <div className="flex items-center bg-orange-50 dark:bg-slate-900 p-1 rounded-xl border border-transparent focus-within:border-orange-400">
                    <input 
                      type="date"
                      className="w-full bg-transparent p-3 rounded-xl font-black outline-none dark:text-white text-xs text-center appearance-none" 
                      value={formData?.fait_le || ""} 
                      onChange={(e) => setFormData({...formData, fait_le: e.target.value})} 
                    />
                  </div>
               </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-black text-brand uppercase tracking-widest border-b-2 border-brand/10 pb-1">2. RAPPORT D'ENQUÊTE</h4>
            <Field label="Introduction" value={formData?.rapport_introduction} isTextarea onChange={(v: string) => setFormData({...formData, rapport_introduction: v})} />
            <Field label="Analyse technique" value={formData?.rapport_analyse_technique} isTextarea onChange={(v: string) => setFormData({...formData, rapport_analyse_technique: v})} />
            <Field label="Analyse des causes" value={formData?.rapport_analyse_causes} isTextarea onChange={(v: string) => setFormData({...formData, rapport_analyse_causes: v})} />
            <Field label="Responsabilités (Rapport)" value={formData?.rapport_responsabilites} isTextarea onChange={(v: string) => setFormData({...formData, rapport_responsabilites: v})} />
            <Field label="Actions correctives" value={formData?.rapport_actions_correctives} isTextarea onChange={(v: string) => setFormData({...formData, rapport_actions_correctives: v})} />
            <Field label="Recommandations" value={formData?.rapport_recommandations} isTextarea onChange={(v: string) => setFormData({...formData, rapport_recommandations: v})} />
            <Field label="Conclusion" value={formData?.rapport_conclusion} isTextarea onChange={(v: string) => setFormData({...formData, rapport_conclusion: v})} />
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200/50 pb-1">3. GESTION ET SUIVI</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={14} className="text-brand" />
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut du dossier</label>
                </div>
                <select className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black outline-none dark:text-white text-sm appearance-none border-2 border-transparent focus:border-brand transition-all" value={formData?.statut} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, statut: e.target.value as DocStatus})}>
                    <option value={DocStatus.SUIVRE} className="dark:bg-slate-900">🚨 À SUIVRE (ACTIF)</option>
                    <option value={DocStatus.CLASSER} className="dark:bg-slate-900">✅ CLASSER (ARCHIVÉ)</option>
                </select>
              </div>

              {/* SECTION RAPPEL MODERNISÉE */}
              <div className="bg-gradient-to-br from-brand/5 to-orange-500/5 dark:from-brand/10 dark:to-orange-500/10 p-6 rounded-[2.5rem] border-2 border-brand/20 shadow-lg relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand/5 rounded-full blur-2xl"></div>
                
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-brand p-2.5 rounded-xl text-white shadow-lg shadow-brand/20">
                    <Clock size={18} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-brand uppercase tracking-widest leading-none mb-1">Rappel automatique</label>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Planification intelligente</p>
                  </div>
                </div>
                
                {/* MODERN SPLIT DATE AND TIME SELECTOR */}
                <div className="flex gap-3 mb-5">
                    <div className="flex-1 bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-brand/10 focus-within:border-brand/40 transition-all flex flex-col items-center shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2">
                           <Calendar size={12} className="text-brand" />
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                        </div>
                        <input 
                            type="date"
                            className="w-full bg-transparent font-black text-center outline-none text-xs dark:text-white appearance-none"
                            value={formData?.rappel_date?.split('T')[0] || ""}
                            onChange={(e) => {
                                const time = formData?.rappel_date?.split('T')[1] || "09:00";
                                setFormData({...formData, rappel_date: `${e.target.value}T${time}`});
                            }}
                        />
                    </div>
                    <div className="flex-1 bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-brand/10 focus-within:border-brand/40 transition-all flex flex-col items-center shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2">
                           <Timer size={12} className="text-brand" />
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Heure</span>
                        </div>
                        <input 
                            type="time"
                            className="w-full bg-transparent font-black text-center outline-none text-xs dark:text-white appearance-none"
                            value={formData?.rappel_date?.split('T')[1] || ""}
                            onChange={(e) => {
                                const date = formData?.rappel_date?.split('T')[0] || new Date().toISOString().split('T')[0];
                                setFormData({...formData, rappel_date: `${date}T${e.target.value}`});
                            }}
                        />
                    </div>
                </div>
                
                <div className="bg-white/60 dark:bg-slate-900/60 p-5 rounded-2xl border border-brand/10 backdrop-blur-sm shadow-inner">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-brand/10 rounded-lg">
                      <BellRing size={14} className="text-brand" />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Instructions de suivi</span>
                  </div>
                  <textarea 
                    className="w-full bg-transparent font-bold outline-none dark:text-white text-xs leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-700" 
                    rows={2}
                    placeholder="Ex: Confirmer la réception des devis..."
                    value={formData?.rappel_details || ""} 
                    onChange={(e) => setFormData({...formData, rappel_details: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50/90 dark:via-slate-950/90 pt-12 flex gap-3 z-30">
        <button onClick={handleSave} disabled={loading} className="flex-1 bg-brand hover:bg-orange-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-[0_10px_40px_rgba(255,107,0,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all">
          {loading ? <Loader2 className="animate-spin" /> : <Save />} ENREGISTRER
        </button>
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  value?: string;
  onChange: (val: string) => void;
  isTextarea?: boolean;
  icon?: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, value, onChange, isTextarea, icon }) => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm focus-within:border-brand/40 transition-all">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className="text-slate-400">{icon}</span>}
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    </div>
    {isTextarea ? (
      <textarea className="w-full bg-transparent font-bold outline-none dark:text-white text-xs leading-relaxed" rows={3} value={value || ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)} />
    ) : (
      <input className="w-full bg-transparent font-black outline-none dark:text-white text-xs" value={value || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} />
    )}
  </div>
);
