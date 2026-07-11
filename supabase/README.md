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
| `admin_users` | Table historique conservee, mais non utilisee et non exposee au public |

La migration initiale est dans `migrations/20260711_wiki_contributions.sql`.
Le durcissement est dans `migrations/20260711_wiki_access_hardening.sql` et a ete applique au projet `gwen-ha-star`.

## Interface publique

Les pages wiki chargent automatiquement :

- `assets/site/wiki-auth.js`
- `assets/site/wiki-contributions.js`
- `assets/site/wiki-comments.js`
- `assets/site/wiki-collaboration.js`

Le client public utilise uniquement la cle publique configuree dans `/shared/supabase-client.js`. La `service_role` ou une cle secrete ne doit jamais etre exposee dans le site statique.

## Console de moderation

La console est disponible dans :

```txt
/hub/admin/
```

Fichiers :

- `hub/admin/index.html`
- `hub/admin/admin.js`
- `hub/admin/admin.css`

La page verifie la session Nitro puis masque le tableau de bord si `profiles.role !== 'superuser'`. Cette verification cote client sert uniquement a l'interface : elle ne constitue pas l'autorisation finale.

## Edge Function `wiki-moderation`

Le code source versionne se trouve dans :

```txt
supabase/functions/wiki-moderation/index.ts
```

La fonction est deployee sur `gwen-ha-star` avec la verification JWT activee. Pour chaque requete elle :

1. valide le Bearer token avec Supabase Auth ;
2. relit le profil depuis `profiles` ;
3. exige `role = 'superuser'` ;
4. utilise la cle `service_role` uniquement dans l'environnement Edge Function ;
5. limite les origines navigateur a `https://nitro.sterenna.fr` et aux serveurs locaux de developpement.

Actions disponibles :

- `list`
- `approve_contribution`
- `reject_contribution`
- `hide_comment`
- `clear_comment_flag`

L'approbation d'une contribution enregistre la decision en base. Elle ne modifie pas automatiquement les fichiers Markdown ou HTML du repo : l'integration editoriale reste une operation Git separee.

## RLS et privileges Data API

Etat public attendu :

| Ressource | `anon` / `authenticated` |
|---|---|
| `contributions` | `INSERT` uniquement |
| `comments` | `SELECT`, `INSERT` uniquement |
| `admin_users` | aucun privilege |

Les politiques d'insertion imposent :

- en anonyme : aucun `author_nitro_id` ;
- en session Nitro : `author_nitro_id = auth.uid()` ;
- le pseudo connecte doit correspondre a `profiles.username` ;
- les commentaires connectes ne peuvent pas injecter un `author_name` anonyme.

Les clients publics n'ont aucun droit `UPDATE` ou `DELETE`. La lecture des propositions en attente est reservee a l'Edge Function de moderation.

## Purge des propositions refusees

La purge peut etre activee via `pg_cron` :

```sql
SELECT cron.schedule('purge-rejected', '0 3 * * *',
  $$ DELETE FROM contributions
     WHERE status = 'rejected'
       AND updated_at < now() - interval '30 days' $$);
```
