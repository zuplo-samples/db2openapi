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

The output OpenAPI file will have CRUD endpoints (Ex. GET, GET all, POST, PATCH, DELETE) generated for you, alongside an OpenAPI component that describes your table using JSON schema. Here's an example:

Some things to note:

- The primary key is assumed to be the only key usable for lookups
- The primary key is marked `readonly` as to not be included in mutating (ex. POST) requests
- The `format` property is used to hint at underlying types

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Generated API",
    "version": "1.0.0"
  },
  "paths": {
    "/products": {
      "get": {
        "summary": "Get list of products",
        "responses": {
          "200": {
            "description": "A list of products",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Products"
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create a new product",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Products"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "product created successfully"
          }
        }
      }
    },
    "/products/{id}": {
      "get": {
        "summary": "Get a specific product by id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "A single product",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Products"
                }
              }
            }
          },
          "404": {
            "description": "product not found"
          }
        }
      },
      "put": {
        "summary": "Update a specific product by id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Products"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "product updated successfully"
          },
          "404": {
            "description": "product not found"
          }
        }
      },
      "delete": {
        "summary": "Delete a specific product by id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "product deleted successfully"
          },
          "404": {
            "description": "product not found"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Products": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int32",
            "default": null,
            "readOnly": true
          },
          "name": {
            "type": "string",
            "default": null
          },
          "image_url": {
            "type": ["string", "null"],
            "default": null
          },
          "category_id": {
            "type": ["integer", "null"],
            "format": "int32",
            "default": null
          }
        },
        "required": ["id", "name"]
      }
    }
  }
}
```
