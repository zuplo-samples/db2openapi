#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const sequelize_1 = require("sequelize");
const fs_1 = require("fs");
const program = new commander_1.Command();
// Initialize Sequelize data source
const initializeSequelize = async (config) => {
    return new sequelize_1.Sequelize(config.database, config.username, config.password, {
        host: config.host,
        port: config.port,
        dialect: config.type,
        logging: false,
    });
};
// Function to generate OpenAPI document
const generateOpenAPIDocument = async (sequelize, outputFile) => {
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully.");
        const models = await sequelize.getQueryInterface().showAllTables();
        const openApiDocument = {
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
        for (const modelName of models) {
            const modelNameKebabCase = modelName
                .replaceAll(" ", "-")
                .replaceAll("_", "-")
                .replace(/([a-z])([A-Z])/g, "$1-$2")
                .toLowerCase();
            const modelNameUpperCamelCase = modelName
                .replaceAll(" ", "")
                .replaceAll("_", "")
                .replace(/(^\w|-\w)/g, (match) => match.replace("-", "").toUpperCase());
            const modelAttributes = await sequelize
                .getQueryInterface()
                .describeTable(modelName);
            // Define Schema for each model
            const schema = {
                type: "object",
                properties: {},
            };
            schema.properties = {};
            let required = [];
            let primaryKey = "id";
            for (const attributeName in modelAttributes) {
                const attribute = modelAttributes[attributeName];
                schema.properties[attributeName] = {
                    type: attribute.allowNull
                        ? [mapSequelizeTypeToOpenAPIType(attribute.type), "null"]
                        : mapSequelizeTypeToOpenAPIType(attribute.type),
                    format: mapSequelizeTypeToFormat(attribute.type),
                    default: attribute.defaultValue,
                    description: attribute.comment ?? undefined,
                    readOnly: attribute.primaryKey ? true : undefined,
                };
                if (!attribute.allowNull) {
                    required.push(attributeName);
                }
                if (attribute.primaryKey) {
                    primaryKey = attributeName;
                }
            }
            schema.required = required;
            openApiDocument.components = {};
            openApiDocument.components.schemas = {};
            openApiDocument.components.schemas[modelNameUpperCamelCase] = schema;
            // Define CRUD endpoints for each model
            openApiDocument.paths = {};
            openApiDocument.paths[`/${modelNameKebabCase}`] = {
                get: {
                    summary: `Get list of ${modelName}`,
                    responses: {
                        "200": {
                            description: `A list of ${modelName}`,
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
                    summary: `Create a new ${modelName}`,
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
                            description: `${modelName} created successfully`,
                        },
                    },
                },
            };
            openApiDocument.paths[`/${modelNameKebabCase}/{${primaryKey}}`] = {
                get: {
                    summary: `Get a specific ${modelName} by ${primaryKey}`,
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
                            description: `A single ${modelName}`,
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: `#/components/schemas/${modelNameUpperCamelCase}`,
                                    },
                                },
                            },
                        },
                    },
                },
                put: {
                    summary: `Update a specific ${modelName} by ${primaryKey}`,
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
                            description: `${modelName} updated successfully`,
                        },
                    },
                },
                delete: {
                    summary: `Delete a specific ${modelName} by ${primaryKey}`,
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
                            description: `${modelName} deleted successfully`,
                        },
                    },
                },
            };
        }
        (0, fs_1.writeFileSync)(outputFile, JSON.stringify(openApiDocument, null, 2));
        console.log(`OpenAPI document has been generated and saved to ${outputFile}`);
    }
    catch (err) {
        console.error("Unable to connect to the database:", err);
    }
    finally {
        await sequelize.close();
    }
};
// Helper function to map Sequelize types to OpenAPI types
const mapSequelizeTypeToOpenAPIType = (type) => {
    if (type.includes("INT")) {
        return "integer";
    }
    else if (type.includes("FLOAT") ||
        type.includes("DOUBLE") ||
        type.includes("DECIMAL") ||
        type.includes("REAL")) {
        return "number";
    }
    else if (type.includes("CHAR") ||
        type.includes("TEXT") ||
        type.includes("DATE")) {
        return "string";
    }
    else if (type.includes("BOOLEAN")) {
        return "boolean";
    }
    return "string";
};
// Helper function to map Sequelize types to OpenAPI formats
const mapSequelizeTypeToFormat = (type) => {
    if (type.includes("INT")) {
        return "int32";
    }
    else if (type.includes("FLOAT") ||
        type.includes("DOUBLE") ||
        type.includes("DECIMAL")) {
        return "float";
    }
    else if (type.includes("DATE")) {
        return "date";
    }
    return undefined;
};
// CLI Configuration
program
    .version("1.0.0")
    .description("Generate OpenAPI documentation from a database using Sequelize")
    .requiredOption("-t, --type <type>", "Database type (e.g., postgres, mysql)")
    .requiredOption("-h, --host <host>", "Database host")
    .requiredOption("-p, --port <port>", "Database port", parseInt)
    .requiredOption("-u, --username <username>", "Database username")
    .requiredOption("-P, --password <password>", "Database password")
    .requiredOption("-d, --database <database>", "Database name")
    .option("-o, --output <file>", "Output file for the OpenAPI document", "openapi.json")
    .action(async (options) => {
    const config = {
        type: options.type,
        host: options.host,
        port: options.port,
        username: options.username,
        password: options.password,
        database: options.database,
    };
    const sequelize = await initializeSequelize(config);
    generateOpenAPIDocument(sequelize, options.output);
});
program.parse(process.argv);
