import { Sequelize } from 'sequelize';
import { writeFileSync, readFileSync } from 'fs';
import { OpenAPIV3_1 } from 'openapi-types';
import { mapSequelizeTypeToOpenAPIType, mapSequelizeTypeToFormat } from './mapping';
import { SqlType } from '../constants';
import { generateExampleForAttribute, attachResponseExamples } from './responseExamples';
import { Theme, DEFAULT_THEME } from '../constants';

export { generateExampleForAttribute } from './responseExamples';
export { initializeSequelizeFromDDL } from './ddl';

// Initialize Sequelize data source
export const initializeSequelize = async (config: any) => {
  return new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.type,
    logging: false,
  });
};

// Function to generate OpenAPI document
export const generateOpenAPIDocument = async (
  sequelize: Sequelize,
  outputFile: string,
  includeExamples: boolean = false,
  theme: Theme | string = DEFAULT_THEME
) => {
  try {
    await sequelize.authenticate();
  } catch (err) {
    console.error("Unable to connect to Database:", err);
  }
  try {
    const models = await sequelize.getQueryInterface().showAllTables();

    const openApiDocument: OpenAPIV3_1.Document = {
      openapi: "3.0.0",
      info: {
        title: "Generated API",
        version: "1.0.0",
      },
      paths: {},
      components: {
        schemas: {},
      },
    };

    // Add a reusable ErrorResponse schema
    openApiDocument.components!.schemas!['ErrorResponse'] = {
      type: 'object',
      properties: {
        code: { type: 'integer', format: 'int32' },
        message: { type: 'string' },
        details: { type: 'object' },
      },
      required: ['code', 'message'],
      example: { code: 500, message: 'Internal server error' },
    };

    for (const modelName of models) {
      const modelNameKebabCase = modelName
        .replaceAll(" ", "-")
        .replaceAll("_", "-")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();
      const modelNameUpperCamelCase = modelName
        .replaceAll(" ", "")
        .replaceAll("_", "")
        .replace(/(^\w|-\n+\w)/g, (match) => match.replace("-", "").toUpperCase());
      const isModelNamePlural = modelName.endsWith("s");
      let modelNamePlural = modelName;
      let modelNameSingular = modelName;
      if (isModelNamePlural) {
        modelNameSingular = modelName.slice(0, -1);
      } else {
        modelNamePlural = modelName + "s";
      }

      const modelAttributes = await sequelize
        .getQueryInterface()
        .describeTable(modelName);

      // Define Schema for each model
      const schema: OpenAPIV3_1.SchemaObject = {
        type: "object",
        properties: {},
      };

      schema.properties = {};
      let required: string[] = [];
      let primaryKey: string = "id";
      const exampleObj: any = {};
      for (const attributeName in modelAttributes) {
        const attribute = modelAttributes[attributeName];
        const type = mapSequelizeTypeToOpenAPIType(attribute.type);
        if (type === "array") {
          schema.properties[attributeName] = {
            type: "array",
            items: {
              type: "string",
            },
            description: attribute.comment ?? undefined,
            readOnly: attribute.primaryKey ? true : undefined,
          };
        } else {
          schema.properties[attributeName] = {
            type: attribute.allowNull ? [type, "null"] : type,
            format: mapSequelizeTypeToFormat(attribute.type),
            enum: (attribute.type || '').toUpperCase().includes(SqlType.ENUM) ? ((attribute.type.match(/'([^']+)'/g) ?? []).map(match => match.slice(1, -1))) : undefined,
            default: attribute.defaultValue,
            description: attribute.comment ?? undefined,
            readOnly: attribute.primaryKey ? true : undefined,
          };
        }
        if (!attribute.allowNull) {
          required.push(attributeName);
        }
        // build example value if requested
        if (includeExamples) {
          exampleObj[attributeName] = generateExampleForAttribute(attributeName, attribute, theme);
        }
        if (attribute.primaryKey) {
          primaryKey = attributeName;
        }
      }
      schema.required = required;
      if (includeExamples) {
        schema.example = exampleObj;
      }

      (openApiDocument.components!.schemas!)[modelNameUpperCamelCase] = schema;

      // Define CRUD endpoints for each model
      (openApiDocument.paths!)[`/${modelNameKebabCase}`] = {
        get: {
          summary: `Get list of ${modelNamePlural}`,
          responses: {
            "200": {
              description: `A list of ${modelNamePlural}`,
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: `#/components/schemas/${modelNameUpperCamelCase}`,
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: `Create a new ${modelNameSingular}`,
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${modelNameUpperCamelCase}`,
                },
              },
            },
          },
          responses: {
            "201": {
              description: `${modelNameSingular} created successfully`,
            },
            "400": {
              description: `Bad Request`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            "500": {
              description: `Internal Server Error`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
          },
        },
      };

      (openApiDocument.paths!)[`/${modelNameKebabCase}/{${primaryKey}}`] = {
        get: {
          summary: `Get a specific ${modelNameSingular} by ${primaryKey}`,
          parameters: [
            {
              name: `${primaryKey}`,
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: `A single ${modelNameSingular}`,
              content: {
                "application/json": {
                  schema: {
                    $ref: `#/components/schemas/${modelNameUpperCamelCase}`,
                  },
                },
              },
            },
            "400": {
              description: `Bad Request`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            "404": {
              description: `${modelNameSingular} not found`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            "500": {
              description: `Internal Server Error`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
          },
        },
        put: {
          summary: `Update a specific ${modelNameSingular} by ${primaryKey}`,
          parameters: [
            {
              name: `${primaryKey}`,
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${modelNameUpperCamelCase}`,
                },
              },
            },
          },
          responses: {
            "200": {
              description: `${modelNameSingular} updated successfully`,
            },
            "400": {
              description: `Bad Request`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            "404": {
              description: `${modelNameSingular} not found`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            "500": {
              description: `Internal Server Error`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
          },
        },
        delete: {
          summary: `Delete a specific ${modelNameSingular} by ${primaryKey}`,
          parameters: [
            {
              name: `${primaryKey}`,
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: `${modelNameSingular} deleted successfully`,
            },
            "400": {
              description: `Bad Request`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            "404": {
              description: `${modelNameSingular} not found`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            "500": {
              description: `Internal Server Error`,
              content: { "application/json": { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
          },
        },
      };
    }

    // If examples are requested, attach example objects to responses
    if (includeExamples) {
      attachResponseExamples(openApiDocument);
    }

    writeFileSync(outputFile, JSON.stringify(openApiDocument, null, 2));
    console.log(
      `OpenAPI document has been generated and saved to ${outputFile}`
    );
  } catch (err) {
    console.error("Error converting DB tables to OpenAPI:", err);
  } finally {
    await sequelize.close();
  }
};

// Helper function to map Sequelize types to OpenAPI types
// mapping and example helpers are provided by lib/mapping.ts and lib/responseExamples.ts
