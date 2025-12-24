
import { GoogleGenAI, Type } from "@google/genai";
import { DocumentData, IncidentType } from "../types";

const avisAppSchema = {
  type: Type.OBJECT,
  properties: {
    victime_objet: { type: Type.STRING },
    description_sinistre: { type: Type.STRING },
    lieu_date_heure: { type: Type.STRING },
    dommages: { type: Type.STRING },
    causes_circonstances: { type: Type.STRING },
    responsabilites: { type: Type.STRING },
    mesures_prises: { type: Type.STRING },
    references_autorites: { type: Type.STRING },
    observations: { type: Type.STRING },
    fait_a: { type: Type.STRING },
    fait_le: { type: Type.STRING },
    
    rapport_introduction: { type: Type.STRING },
    rapport_analyse_technique: { type: Type.STRING },
    rapport_analyse_causes: { type: Type.STRING },
    rapport_responsabilites: { type: Type.STRING },
    rapport_actions_correctives: { type: Type.STRING },
    rapport_recommandations: { type: Type.STRING },
    rapport_conclusion: { type: Type.STRING },
    
    nature_incident: { type: Type.STRING, enum: Object.values(IncidentType) },
    date_iso: { type: Type.STRING, description: "Date au format YYYY-MM-DD identifiée dans le contenu" }
  },
  required: ["victime_objet", "description_sinistre", "lieu_date_heure", "nature_incident", "date_iso"]
};

export const analyzeIncident = async (
  base64Data: string | null,
  mimeType: string | null,
  userNotes: string = ""
): Promise<Partial<DocumentData>> => {
  // Toujours recréer l'instance pour utiliser la clé la plus récente sélectionnée par l'utilisateur
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents: any = { parts: [] };

  if (base64Data && mimeType) {
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    contents.parts.push({ inlineData: { mimeType, data: cleanBase64 } });
  }

  const prompt = `
    RÔLE : Tu es un assistant administratif et technique expert en rédaction d'Avis d'Incident et de Rapports d'Enquête.
    TON : Français administratif clair, neutre, structuré et factuel.
    
    INSTRUCTIONS :
    - Analyse l'image/PDF et les notes : "${userNotes}".
    - Remplis toutes les rubriques du rapport.
    - Pour 'fait_a', utilise 'Tahannaout' par défaut si non trouvé.
    - Pour 'fait_le', utilise la date du jour si non trouvée.
  `;

  contents.parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Utilisation de Flash pour un quota supérieur et une latence réduite
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: avisAppSchema,
        temperature: 0.1,
        systemInstruction: "Tu es l'assistant Avisapp. Rédige de façon administrative stricte. Réponds uniquement en JSON."
      }
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA.");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error?.message?.includes('quota') || error?.message?.includes('429')) {
      throw new Error("Quota épuisé. Veuillez sélectionner une clé API valide ou un projet avec facturation dans les Paramètres.");
    }
    throw error;
  }
};
