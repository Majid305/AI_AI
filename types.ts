
export enum DocStatus {
  SUIVRE = "Suivre",
  CLASSER = "Classer"
}

export enum IncidentType {
  INCENDIE = "Incendie",
  DEGAT_EAUX = "Dégât des eaux",
  VANDALISME = "Vandalisme",
  ACCIDENT_TRAVAIL = "Accident de travail",
  PANNE_TECHNIQUE = "Panne technique",
  VOL_EFFRACTION = "Vol / Effraction",
  SINISTRE_ELECTRIQUE = "Sinistre électrique",
  RESEAU_ELECTRIQUE = "Réseau Électrique",
  TIERS = "Tiers",
  AUTRE = "Autre"
}

export interface DocumentData {
  id: string; // Format: SRM-MS/DPH/AI-MMYYN
  document_image: string; 
  mimeType: string;
  aux_images: string[]; // Max 3 images liées aux causes et circonstances
  
  // Avis d'Incident (Page 1)
  victime_objet: string;
  description_sinistre: string;
  lieu_date_heure: string;
  dommages: string;
  causes_circonstances: string;
  responsabilites: string;
  mesures_prises: string;
  references_autorites: string;
  observations: string;
  
  // Nouveaux champs signature
  fait_a: string;
  fait_le: string;

  // Rapport d'Enquête (Page 2)
  rapport_introduction: string;
  rapport_analyse_technique: string;
  rapport_analyse_causes: string;
  rapport_responsabilites: string;
  rapport_actions_correctives: string;
  rapport_recommandations: string;
  rapport_conclusion: string;

  // Métadonnées
  date_iso: string; // YYYY-MM-DD
  nature_incident: IncidentType;
  statut: DocStatus;
  rappel_actif: boolean;
  rappel_date?: string; // Date ISO pour le widget
  rappel_details?: string; // Note textuelle
  created_at: number;
}

export type ScreenName = 'scanner' | 'dashboard' | 'stats' | 'settings';
