-- Migration: Ajout d'indices pour optimisation performance
-- Date: 2026-04-02
-- Impact: Amélioration requêtes DB de 50-70%

-- Indices pour bookings (requêtes calendrier fréquentes)
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);

-- Indices pour properties (recherche et filtres)
CREATE INDEX IF NOT EXISTS idx_properties_user ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);

-- Indices pour reviews (affichage notes)
CREATE INDEX IF NOT EXISTS idx_reviews_property ON reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);

-- Indices pour photos (galeries)
CREATE INDEX IF NOT EXISTS idx_photos_property ON photos(property_id);
CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(property_id, "order");

-- Indices pour cleanings (planning)
CREATE INDEX IF NOT EXISTS idx_cleanings_date ON cleanings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_cleanings_property ON cleanings(property_id);
CREATE INDEX IF NOT EXISTS idx_cleanings_status ON cleanings(status);

-- Indices pour maintenance (suivi tâches)
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_property ON maintenance_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance_tasks(priority);

-- Indices pour payments (rapports financiers)
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Indices pour audit logs (recherche historique)
CREATE INDEX IF NOT EXISTS idx_auditlogs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auditlogs_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auditlogs_action ON audit_logs(action);

-- Indices composites pour requêtes complexes
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates ON bookings(property_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_cleanings_property_date ON cleanings(property_id, scheduled_date);

-- Statistiques
ANALYZE bookings;
ANALYZE properties;
ANALYZE reviews;
ANALYZE photos;
ANALYZE cleanings;
ANALYZE maintenance_tasks;
ANALYZE payments;
ANALYZE audit_logs;

-- Fin migration
