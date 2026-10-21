# Production read-only connection (WSL)

How to connect to the Production Supabase database from WSL with the `claude_readonly` role, through the Supavisor pooler (transaction mode).

The role can only `SELECT` from `public`. It cannot write, and it cannot read `auth`, `storage` or `vault`. Never commit the password.

## 1. Install the client (once)

```bash
sudo apt update && sudo apt install -y postgresql-client
psql --version
```

## 2. Store the connection string in `.env.local`

`.env.local` is gitignored. Replace `<put_in_env>` with the real password (URL-encode special characters: `@` -> `%40`, `#` -> `%23`, `/` -> `%2F`).

```bash
PROD_RO_URL="postgresql://claude_readonly.hciafxugihqydutjvpyq:<put_in_env>@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require"
```

## 3. Connect

```bash
cd ~/jmvelez/Udemy/ClaudeCode/05-arcade-vault
set -a; source .env.local; set +a
psql "$PROD_RO_URL"
```

Run a single query without opening the prompt:

```bash
psql "$PROD_RO_URL" -c "select current_user;"
psql "$PROD_RO_URL" -c "select count(*) from public.games;"
```

## Useful `psql` commands

| Command            | What it does                    |
| ------------------ | ------------------------------- |
| `\dt public.*`     | list tables                     |
| `\dv public.*`     | list views                      |
| `\d public.scores` | describe a table                |
| `\conninfo`        | show who and where you connect  |
| `\q`               | quit                            |

## Verify the role is read-only

```sql
select current_user;                    -- claude_readonly
show default_transaction_read_only;     -- on
select count(*) from public.games;      -- > 0
insert into public.games (id) values ('x');  -- must fail

begin;
set transaction read write;
delete from public.scores;              -- must fail: permission denied
rollback;

select count(*) from auth.users;        -- must fail: permission denied for schema auth
```

## Troubleshooting

- `could not translate host name`: WSL DNS issue. Run `ping aws-0-us-east-2.pooler.supabase.com`.
- `password authentication failed`: the user must be `claude_readonly.hciafxugihqydutjvpyq` (with the project ref), not just `claude_readonly`. Check the password encoding.
- `Tenant or user not found`: wrong project ref or region in the host. Copy the string again from Dashboard -> Connect.
- Hangs on port `6543`: the network may block it. Try the session pooler on port `5432`.

## Revoke access

Only when read-only access is no longer needed. To pause it, run `alter role claude_readonly nologin;` (and `login` to re-enable).

```sql
alter default privileges for role postgres in schema public revoke select on tables from claude_readonly;
alter default privileges for role postgres in schema public revoke select on sequences from claude_readonly;
revoke all on all tables in schema public from claude_readonly;
revoke all on all sequences in schema public from claude_readonly;
revoke usage on schema public from claude_readonly;
revoke connect on database postgres from claude_readonly;
drop role claude_readonly;
```
