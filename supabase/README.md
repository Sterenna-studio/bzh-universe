# Supabase — BZH Universe Wiki

## Tables créées

| Table | Rôle |
|---|---|
| `contributions` | Propositions d'edit de contenu wiki (pending → approved/rejected) |
| `comments` | Commentaires libres en bas de page |
| `admin_users` | Super users autorisés à modérer (identifiés par nitro_id) |

## Appliquer la migration

1. Ouvrir le **SQL Editor** dans le dashboard Supabase
2. Coller le contenu de `migrations/20260711_wiki_contributions.sql`
3. Exécuter — aucune table existante n'est modifiée

## Auth Nitro (Option B — cookie partagé)

Le wiki lit le cookie de session `nitro.sterenna.fr` pour identifier l'utilisateur.
Le JS extrait `nitro_id` et `nitro_username` du cookie et les passe
en tant que champs dans `contributions` et `comments`.

Aucune auth Supabase Auth n'est utilisée côté visiteurs.
Les admins accèdent à la page `/admin/` protégée par vérification
de `admin_users` via la clé `service_role` (jamais exposée côté client).

## Ajouter un admin

```sql
INSERT INTO admin_users (nitro_id, nitro_username, role)
VALUES ('TON_NITRO_ID', 'TonPseudo', 'superadmin');
```

## Purge automatique des rejected

Activer dans le dashboard Supabase → **Database → pg_cron** :

```sql
SELECT cron.schedule('purge-rejected', '0 3 * * *',
  $$ DELETE FROM contributions WHERE status = 'rejected'
     AND updated_at < now() - interval '30 days' $$);
```
