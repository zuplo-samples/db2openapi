# DB2OpenAPI

Generate an OpenAPI/Swagger specification from your SQL database. The OpenAPI spec will be written to a file.

## Motivation

There are [several DB to API projects](https://github.com/dbohdan/automatic-api) out there, but they almost all lock you into building your API a certain way or using their managed service to get the full experience. I'd prefer to decouple the API definition from the API implementation - you are free to use your generated OpenAPI specification with any OpenAPI-compliant web framework (ex. Huma, tsoa, Connexion) and develop your DB-backed CRUD APIs with tools you're already familiar with / using. If you don't want to tie your API directly to your database, this is essentially a quickstart to building a CRUD API.

## Database Support

This project uses [Sequelize](https://sequelize.org/) under the hood, which supports

- PostgreSQL
- MariaDB
- MySQL
- MSSQL
- SQLite
- Oracle

## Local Installation

```bash
npm run build
npm install -g
```

## Usage

Invoke using the `db2openapi` command. Here's an example connecting to a Supabase Postgres Database:

```bash
db2openapi -t postgres -h aws-0-us-west-1.pooler.supabase.com -p 5432 -u postgres.ndizqitliqszxibppdxg -P <YOUR_DB_PASSWORD> -d postgres
```

| Option               | Required | Description                                                 |
| -------------------- | -------- | ----------------------------------------------------------- |
| `-t` or `--type`     | Y        | Database type (e.g., postgres, mysql)                       |
| `-h` or `--host`     | Y        | Database host                                               |
| `-p` or `--port`     | Y        | Database port                                               |
| `-u` or `--username` | Y        | Database username                                           |
| `-P` or `--password` | Y        | Database password                                           |
| `-d` or `--database` | Y        | Database name                                               |
| `-o` or `--output`   | N        | Output file for the OpenAPI document. Default: openapi.json |
