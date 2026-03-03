
import React, { useEffect, useState } from 'react';
import { Search, Filter, Download, Trash2, Printer, Loader2, ShieldAlert, CheckCircle, Copy, Bell, BellOff, Paperclip, FileText, Wand2, Edit3, X, BellRing, Clock } from 'lucide-react';
import { DocumentData, DocStatus } from '../types';
import { getAllDocuments, deleteDocument } from '../services/db';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";

interface DashboardProps {
    onEdit: (doc: DocumentData, triggerAI?: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onEdit }) => {
    const [documents, setDocuments] = useState<DocumentData[]>([]);
    const [filteredDocs, setFilteredDocs] = useState<DocumentData[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<"ALL" | DocStatus>("ALL");
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [duplicatingDoc, setDuplicatingDoc] = useState<DocumentData | null>(null);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        let res = documents;
        if (search) {
            const lower = search.toLowerCase();
            res = res.filter(d => 
                d.id.toLowerCase().includes(lower) || 
                d.victime_objet.toLowerCase().includes(lower) ||
                d.description_sinistre.toLowerCase().includes(lower)
            );
        }
        if (filterStatus !== "ALL") res = res.filter(d => d.statut === filterStatus);
        setFilteredDocs(res);
    }, [search, filterStatus, documents]);

    const loadData = async () => setDocuments(await getAllDocuments());

    const handleDuplicateClick = (doc: DocumentData, e: React.MouseEvent) => {
        e.stopPropagation();
        setDuplicatingDoc(doc);
    };

    const confirmDuplicate = (mode: 'MANUAL' | 'IA') => {
        if (!duplicatingDoc) return;
        
        const { id, ...rest } = duplicatingDoc;
        const newDoc = { 
            ...rest, 
            id: "", 
            created_at: Date.now(),
            statut: DocStatus.SUIVRE,
            rappel_actif: true,
            fait_a: "Tahannaout",
            fait_le: new Date().toISOString().split('T')[0]
        };
        onEdit(newDoc as DocumentData, mode === 'IA');
        setDuplicatingDoc(null);
    };

    const handleGeneratePDF = async (doc: DocumentData, e: React.MouseEvent) => {
        e.stopPropagation();
        setGeneratingPdf(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 12;
            let currentY = 55; 

            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0, 0, 0);
            pdf.text("MONSIEUR LE DIRECTEUR GÉNÉRAL", pageWidth / 2, currentY, { align: "center" });
            currentY += 8;
            pdf.text(`AVIS D'INCIDENT N°: ${doc.id}`, pageWidth / 2, currentY, { align: "center" });
            currentY += 12;

            const rubrics = [
                { label: "1-Victime ou objet du sinistre", value: doc.victime_objet },
                { label: "2-Description du sinistre", value: doc.description_sinistre },
                { label: "3-Lieu, date et heure du sinistre", value: doc.lieu_date_heure },
                { label: "4-Dommages (nature et évaluation sommaire)", value: doc.dommages },
                { label: "5-Causes et circonstances détaillées", value: doc.causes_circonstances },
                { label: "6-Responsabilités", value: doc.responsabilites },
                { label: "7-Mesures prises pour la limitation ou réparation", value: doc.mesures_prises },
                { label: "8-Références (autorités, dépôt de plainte)", value: doc.references_autorites },
                { label: "9-Observations", value: doc.observations }
            ];

            const col1Width = 55;
            const col2Width = pageWidth - 2 * margin - col1Width;
            pdf.setFontSize(9);

            rubrics.forEach(rubric => {
                const textLines = pdf.splitTextToSize(rubric.value || "Non communiqué", col2Width - 4);
                const labelLines = pdf.splitTextToSize(rubric.label, col1Width - 4);
                const cellHeight = Math.max(12, Math.max(textLines.length, labelLines.length) * 5 + 4);
                
                if (currentY + cellHeight > 275) { pdf.addPage(); currentY = 15; }

                pdf.setDrawColor(180);
                pdf.rect(margin, currentY, col1Width, cellHeight);
                pdf.rect(margin + col1Width, currentY, col2Width, cellHeight);
                
                pdf.setFont("helvetica", "bold");
                pdf.text(labelLines, margin + 2, currentY + 6);
                pdf.setFont("helvetica", "normal");
                pdf.text(textLines, margin + col1Width + 2, currentY + 6);
                currentY += cellHeight;
            });

            currentY += 15;
            pdf.setFontSize(10);
            const displayDate = doc.fait_le?.includes('-') ? new Date(doc.fait_le).toLocaleDateString('fr-FR') : doc.fait_le;
            const signaturePlaceDate = `Fait à : ${doc.fait_a || 'Tahannaout'}    Le : ${displayDate || new Date().toLocaleDateString('fr-FR')}`;
            pdf.setFont("helvetica", "bold");
            pdf.text(signaturePlaceDate, pageWidth / 2, currentY, { align: "center" });
            
            currentY += 15;
            pdf.text("Signature du Chef de l'entité", margin + 15, currentY);
            pdf.text("Signature du Chef de Département", pageWidth - margin - 65, currentY);

            pdf.addPage();
            currentY = 20;
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            pdf.text("RAPPORT D'ENQUÊTE", pageWidth / 2, currentY, { align: "center" });
            currentY += 15;

            const sections = [
                { t: "Introduction", c: doc.rapport_introduction },
                { t: "Analyse technique", c: doc.rapport_analyse_technique },
                { t: "Analyse des causes", c: doc.rapport_analyse_causes },
                { t: "Responsabilités", c: doc.rapport_responsabilites },
                { t: "Actions correctives", c: doc.rapport_actions_correctives },
                { t: "Recommandations", c: doc.rapport_recommandations },
                { t: "Conclusion", c: doc.rapport_conclusion }
            ];

            sections.forEach(s => {
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "bold");
                pdf.text(s.t, margin, currentY);
                currentY += 6;
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(10);
                const lines = pdf.splitTextToSize(s.c || "Non communiqué", pageWidth - 2 * margin);
                pdf.text(lines, margin, currentY);
                currentY += lines.length * 5 + 8;
                if (currentY > 270) { pdf.addPage(); currentY = 20; }
            });

            const allImgs = [doc.document_image, ...(doc.aux_images || [])].filter(i => i && i.length > 500);
            if (allImgs.length > 0) {
                pdf.addPage();
                currentY = 20;
                pdf.setFontSize(14);
                pdf.setFont("helvetica", "bold");
                pdf.text("ANNEXES PHOTOGRAPHIQUES", pageWidth / 2, currentY, { align: "center" });
                currentY += 15;
                
                let imgCount = 0;
                allImgs.forEach(img => {
                    if (imgCount === 3) { pdf.addPage(); currentY = 20; imgCount = 0; }
                    try {
                        pdf.addImage(img, 'JPEG', margin + 15, currentY, pageWidth - 2 * margin - 30, 75);
                        currentY += 85;
                        imgCount++;
                    } catch(e) {}
                });
            }

            pdf.save(`Dossier_Avisapp_${doc.id.replace(/\//g, '-')}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Erreur de génération PDF.");
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Supprimer ce dossier ?")) {
            await deleteDocument(id);
            loadData();
        }
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden">
            {generatingPdf && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-md">
                    <Loader2 size={48} className="animate-spin text-brand mb-4" />
                    <p className="font-black text-xl uppercase tracking-tighter">Édition du rapport officiel...</p>
                </div>
            )}

            {duplicatingDoc && (
                <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-6 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm border-2 border-brand/20">
                        <ShieldAlert size={40} className="text-brand mx-auto mb-4" />
                        <h3 className="text-lg font-black text-center mb-2 uppercase tracking-tight dark:text-white">Duplication</h3>
                        <p className="text-xs text-center text-slate-500 mb-8 font-medium italic">Comment souhaitez-vous traiter ce duplicata ?</p>
                        <div className="grid gap-3">
                            <button onClick={() => confirmDuplicate('MANUAL')} className="flex items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 active:scale-95 transition-all">
                                <Edit3 size={18}/> Modification Manuelle
                            </button>
                            <button onClick={() => confirmDuplicate('IA')} className="flex items-center justify-center gap-3 bg-brand text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                                <Wand2 size={18}/> Réorganisation par IA
                            </button>
                            <button onClick={() => setDuplicatingDoc(null)} className="mt-4 text-[10px] font-black uppercase text-slate-400">Annuler</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-4 shadow-sm border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Dossiers</h2>
                    <button onClick={() => {
                        const ws = XLSX.utils.json_to_sheet(documents.map(({document_image, aux_images, ...rest}) => rest));
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Avisapp_Incidents");
                        XLSX.writeFile(wb, "Avisapp_Archive.xlsx");
                    }} className="bg-brand/10 p-2.5 rounded-xl text-brand active:scale-90 transition-transform"><Download size={22} /></button>
                </div>
                
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 ring-brand text-slate-800 dark:text-white font-medium" placeholder="Rechercher un incident..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button className={`p-3.5 rounded-2xl border-2 transition-all ${filterStatus !== 'ALL' ? 'bg-brand text-white border-brand' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`} onClick={() => setFilterStatus(filterStatus === 'ALL' ? DocStatus.SUIVRE : filterStatus === DocStatus.SUIVRE ? DocStatus.CLASSER : "ALL")}>
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
                {filteredDocs.map(doc => (
                    <div 
                      key={doc.id} 
                      onClick={() => onEdit(doc)} 
                      className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-5 border-l-[10px] transition-all active:scale-[0.98] relative group border-2 border-transparent ${doc.statut === DocStatus.CLASSER ? 'border-l-green-500' : 'border-l-brand'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldAlert size={12} className={doc.statut === DocStatus.CLASSER ? 'text-green-500' : 'text-brand'} />
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${doc.statut === DocStatus.CLASSER ? 'text-green-600' : 'text-brand'}`}>{doc.id}</span>
                                </div>
                                <h3 className="font-black text-slate-900 dark:text-white leading-tight uppercase truncate">{doc.victime_objet}</h3>
                                <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase mt-1">
                                    <FileText size={10} />
                                    {doc.lieu_date_heure}
                                </div>
                            </div>
                            <div className="ml-2 flex flex-col items-center gap-2">
                                {doc.rappel_actif ? <Bell size={18} className="text-brand animate-pulse" /> : <BellOff size={18} className="text-slate-300" />}
                                {(doc.rappel_date || doc.rappel_details) && (
                                    <div className="bg-brand/10 p-1.5 rounded-lg mt-1">
                                        <BellRing size={12} className="text-brand" />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {(doc.rappel_date || doc.rappel_details) && (
                             <div className="bg-brand/5 dark:bg-brand/10 border-l-2 border-brand p-2 my-2 rounded-r-lg">
                                 <p className="text-[10px] font-bold text-brand uppercase mb-0.5 flex items-center gap-1">
                                    <Clock size={10}/> Rappel {doc.rappel_date && `: ${new Date(doc.rappel_date).toLocaleString('fr-FR')}`}
                                 </p>
                                 {doc.rappel_details && <p className="text-[10px] text-slate-700 dark:text-slate-300 italic">{doc.rappel_details}</p>}
                             </div>
                        )}

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-3 leading-relaxed border-t border-slate-50 dark:border-slate-800 pt-3 italic">
                            {doc.description_sinistre}
                        </p>

                        <div className="flex items-center justify-between mt-5">
                             <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black px-3 py-1 rounded-full border-2 ${doc.statut === DocStatus.CLASSER ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-brand border-orange-100'}`}>
                                    {doc.statut.toUpperCase()}
                                </span>
                                {doc.aux_images && doc.aux_images.length > 0 && (
                                    <span className="bg-slate-50 dark:bg-slate-800 text-slate-400 text-[9px] px-2 py-1 rounded-full border border-slate-100 dark:border-slate-700 flex items-center gap-1">
                                        <Paperclip size={10} /> {doc.aux_images.length} imgs
                                    </span>
                                )}
                             </div>
                             <div className="flex gap-1.5">
                                <button onClick={e => handleDuplicateClick(doc, e)} title="Dupliquer" className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 active:scale-90 transition-transform"><Copy size={16}/></button>
                                <button onClick={e => handleGeneratePDF(doc, e)} title="Imprimer PDF" className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 active:scale-90 transition-transform"><Printer size={16}/></button>
                                <button onClick={e => handleDelete(doc.id, e)} title="Supprimer" className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500 active:scale-90 transition-transform"><Trash2 size={16}/></button>
                             </div>
                        </div>
                    </div>
                ))}
                
                {filteredDocs.length === 0 && (
                    <div className="flex flex-col items-center justify-center pt-24 text-slate-300 dark:text-slate-800">
                        <CheckCircle size={64} className="mb-4 opacity-10" />
                        <p className="font-black text-xs uppercase tracking-[0.2em]">Archive Administrative Vide</p>
                    </div>
                )}
            </div>
        </div>
    );
};
