-- Migration: ajoute les colonnes dévotionnelles à la table verses
-- Date: 2026-01-02
-- Description: Stocke la mini-méditation générée par Gemini (format YouVersion-like)
--              pour éviter de régénérer à chaque ouverture de la modale.

alter table public.verses
  add column if not exists reflection text,
  add column if not exists meditation_question text;

-- Les colonnes explanation et prayer_guide existent déjà
-- (utilisées par la version précédente de la Edge Function).
-- On les garde ; le nouveau prompt les réutilise sous les noms
-- "context" (mappé vers explanation) et "prayer" (mappé vers prayer_guide).
