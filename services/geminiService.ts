
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
    
    nature_incident: { type: Type.STRING, enum: Object.values(IncidentType) },
    date_iso: { type: Type.STRING, description: "Date au format YYYY-MM-DD" }
  },
  required: ["victime_objet", "description_sinistre", "lieu_date_heure", "nature_incident", "date_iso"]
};

const rapportOnlySchema = {
  type: Type.OBJECT,
  properties: {
    rapport_introduction: { type: Type.STRING },
    rapport_analyse_technique: { type: Type.STRING },
    rapport_analyse_causes: { type: Type.STRING },
    rapport_responsabilites: { type: Type.STRING },
    rapport_actions_correctives: { type: Type.STRING },
    rapport_recommandations: { type: Type.STRING },
    rapport_conclusion: { type: Type.STRING }
  },
  required: ["rapport_introduction", "rapport_analyse_technique", "rapport_analyse_causes", "rapport_responsabilites", "rapport_actions_correctives", "rapport_recommandations", "rapport_conclusion"]
};

export const analyzeIncident = async (
  base64Data: string | null,
  mimeType: string | null,
  userNotes: string = ""
): Promise<Partial<DocumentData>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contents: any = { parts: [] };

  if (base64Data && mimeType) {
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    contents.parts.push({ inlineData: { mimeType, data: cleanBase64 } });
  }

  const prompt = `
    RÔLE : Assistant expert en rédaction d'Avis d'Incident.
    INSTRUCTIONS :
    - Analyse la source (image/PDF) et les notes : "${userNotes}".
    - Extrais et structure les informations pour un rapport officiel.
    - Pour 'fait_a', utilise 'Tahannaout' par défaut.
    - Pour 'fait_le' et 'date_iso', utilise la date du jour (${new Date().toISOString().split('T')[0]}) si aucune date n'est détectée.
  `;

  contents.parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: avisAppSchema,
        temperature: 0.1
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Analyze Error:", error);
    throw error;
  }
};

/**
 * Réviser uniquement les champs textuels fournis dans le formulaire.
 * Objectif : Correction orthographique, grammaticale et style administratif.
 */
export const reviseAvisFields = async (currentAvis: Partial<DocumentData>): Promise<Partial<DocumentData>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    RÔLE : Correcteur et rédacteur administratif expert.
    MISSION : Réviser les champs textuels d'un Avis d'Incident.
    
    INSTRUCTIONS :
    1. Corrige uniquement l'orthographe et la grammaire.
    2. Reformule les phrases pour un style administratif professionnel, clair et concis (Français soutenu).
    3. NE CHANGE PAS les faits ni les informations de base.
    4. Ignore toute source de données externe (images/PDF), base-toi uniquement sur le texte ci-dessous.
    5. Conserve la valeur 'date_iso' et les autres champs techniques tels quels.

    TEXTE À RÉVISER :
    - Victime/Objet : ${currentAvis.victime_objet}
    - Description : ${currentAvis.description_sinistre}
    - Lieu/Date/Heure : ${currentAvis.lieu_date_heure}
    - Dommages : ${currentAvis.dommages}
    - Causes/Circonstances : ${currentAvis.causes_circonstances}
    - Responsabilités : ${currentAvis.responsabilites}
    - Mesures prises : ${currentAvis.mesures_prises}
    - Observations : ${currentAvis.observations}
    - Fait à : ${currentAvis.fait_a}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: avisAppSchema,
        temperature: 0.1
      }
    });
    const result = JSON.parse(response.text || "{}");
    
    // On s'assure de ne pas écraser les champs non textuels ou techniques s'ils manquent
    return {
      ...currentAvis,
      ...result
    };
  } catch (error) {
    console.error("Gemini Revision Error:", error);
    throw error;
  }
};

export const updateRapportFromAvis = async (avisData: Partial<DocumentData>): Promise<Partial<DocumentData>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Rédige un Rapport d'Enquête structuré et complet basé exclusivement sur les données de cet Avis d'Incident :
    ${JSON.stringify(avisData, null, 2)}
    
    Développe chaque section technique de manière professionnelle et détaillée.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: rapportOnlySchema,
        temperature: 0.2
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Rapport Error:", error);
    throw error;
  }
};
