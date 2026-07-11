# Supabase — BZH Universe Wiki

## Architecture active

Le wiki est deploye sous `https://nitro.sterenna.fr/bzh-universe/` et utilise le meme projet Supabase que Nitro (`gwen-ha-star`).

Les modules partages sont importes depuis :

```js
import { supabase } from '/shared/supabase-client.js';
import { getProfile } from '/shared/profile.js';
```

La session Supabase est partagee par origine avec Nitro. Le profil applicatif reste la source de verite :

- `profiles.id` = `auth.users.id`
- `profiles.username` = pseudo affiche
- `profiles.role` = `all` ou `superuser`

## Tables wiki

| Table | Role |
|---|---|
| `contributions` | Propositions d'edition (`pending`, `approved`, `rejected`) |
| `comments` | Commentaires de page (`visible`, `hidden`, `flagged`) |
| `admin_users` | Table historique conservee, mais non utilisee par le code |

La migration initiale est dans `migrations/20260711_wiki_contributions.sql` et a deja ete executee sur le projet. Le durcissement des privileges et de l'attribution est prepare dans `migrations/20260711_wiki_access_hardening.sql`.

## Interface publique

Les pages wiki chargent automatiquement :

- `assets/site/wiki-auth.js`
- `assets/site/wiki-contributions.js`
- `assets/site/wiki-comments.js`
- `assets/site/wiki-collaboration.js`

Le client public utilise uniquement la cle publique configuree dans `/shared/supabase-client.js`. La `service_role` ou une cle secrete ne doit jamais etre exposee dans ce repo statique.

## Moderation

Le role d'administration se verifie avec `profiles.role === 'superuser'`.

La future interface `/hub/admin/` pourra afficher les files de moderation cote client, mais les operations privilegiees (`approved`, `rejected`, `hidden`, suppression) devront appeler une Supabase Edge Function qui :

1. valide le JWT de l'utilisateur ;
2. relit `profiles.role` cote serveur ;
3. refuse toute operation si le role n'est pas `superuser` ;
4. utilise la cle secrete uniquement dans l'environnement de la fonction.

## RLS et Data API

RLS controle les lignes, mais les privileges Postgres controlent aussi l'acces aux tables. Verifier que les roles `anon` et `authenticated` disposent uniquement des droits necessaires :

```sql
grant select, insert on table public.contributions to anon, authenticated;
grant select, insert on table public.comments to anon, authenticated;
```

Les clients publics ne doivent pas recevoir de droit `update` ou `delete` sur ces tables.

## Purge des propositions refusees

La purge peut etre activee via `pg_cron` :

```sql
SELECT cron.schedule('purge-rejected', '0 3 * * *',
  $$ DELETE FROM contributions
     WHERE status = 'rejected'
       AND updated_at < now() - interval '30 days' $$);
```
