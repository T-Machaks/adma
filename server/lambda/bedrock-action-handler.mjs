const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

// Create DynamoDB client for af-south-1 region
const dynamoClient = new DynamoDBClient({ region: "af-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

exports.handler = async (event) => {
    console.log('Bedrock action:', JSON.stringify(event, null, 2));

    try {
        // Handle announcements API path
        if (event.apiPath === '/api/announcements') {
            console.log('Fetching announcements...');

            const announcements = [
                {
                    id: 1,
                    title: "Minecon Live 2026 Opening Ceremony",
                    content: "Join us for the grand opening of Minecon Live 2026! Experience the latest Minecraft updates, meet the developers, and connect with the community.",
                    timestamp: "2026-06-19T10:00:00Z",
                    priority: "high",
                    category: "event"
                },
                {
                    id: 2,
                    title: "New Minecraft Update 1.22 Reveal",
                    content: "Discover the amazing new features coming to Minecraft in the 1.22 update, including new biomes, mobs, and building blocks.",
                    timestamp: "2026-06-19T14:00:00Z",
                    priority: "high",
                    category: "update"
                },
                {
                    id: 3,
                    title: "Community Building Contest Winners",
                    content: "Congratulations to all the winners of our community building contest! See the incredible creations that amazed our judges.",
                    timestamp: "2026-06-19T16:30:00Z",
                    priority: "medium",
                    category: "community"
                },
                {
                    id: 4,
                    title: "Minecraft Education Edition Workshop",
                    content: "Learn how to use Minecraft in educational settings with our special workshop for teachers and educators.",
                    timestamp: "2026-06-20T11:00:00Z",
                    priority: "medium",
                    category: "education"
                },
                {
                    id: 5,
                    title: "Meet the Developers Session",
                    content: "Get a chance to meet the Minecraft development team and ask them questions about the game's future.",
                    timestamp: "2026-06-20T15:00:00Z",
                    priority: "high",
                    category: "developer"
                }
            ];

            console.log(`Returning ${announcements.length} announcements`);

            return {
                messageVersion: "1.0",
                response: {
                    actionGroup: event.actionGroup,
                    apiPath: event.apiPath,
                    httpMethod: event.httpMethod,
                    httpStatusCode: 200,
                    responseBody: {
                        "application/json": {
                            body: JSON.stringify({
                                announcements: announcements,
                                total: announcements.length,
                                lastUpdated: new Date().toISOString(),
                                event: "Minecon Live 2026"
                            })
                        }
                    }
                }
            };
        }

        // Handle exhibitors API path
        if (event.apiPath === '/api/exhibitors') {
            console.log('Fetching exhibitors from DynamoDB...');

            try {
                const result = await docClient.send(new ScanCommand({ TableName: 'minecon_exhibitors' }));
                const exhibitors = result.Items || [];

                console.log(`Found ${exhibitors.length} exhibitors from DynamoDB`);

                return {
                    messageVersion: "1.0",
                    response: {
                        actionGroup: event.actionGroup,
                        apiPath: event.apiPath,
                        httpMethod: event.httpMethod,
                        httpStatusCode: 200,
                        responseBody: {
                            "application/json": {
                                body: JSON.stringify({
                                    exhibitors: exhibitors,
                                    total: exhibitors.length,
                                    event: "Minecon Live 2026",
                                    source: "DynamoDB"
                                })
                            }
                        }
                    }
                };

            } catch (dynamoError) {
                console.error('DynamoDB error:', dynamoError);

                const mockExhibitors = [
                    { id: 1, name: "Mojang Studios", category: "Game Developer", booth: "Hall A - Booth 101", description: "The creators of Minecraft, showcasing the latest updates and upcoming features", website: "https://mojang.com", featured: true },
                    { id: 2, name: "Microsoft Gaming", category: "Technology Partner", booth: "Hall A - Booth 102", description: "Xbox integration, cloud gaming solutions, and cross-platform play for Minecraft", website: "https://xbox.com", featured: true },
                    { id: 3, name: "NVIDIA", category: "Hardware Partner", booth: "Hall B - Booth 201", description: "RTX graphics technology and ray tracing for enhanced Minecraft visual experience", website: "https://nvidia.com", featured: false },
                    { id: 4, name: "Intel", category: "Hardware Partner", booth: "Hall B - Booth 202", description: "High-performance processors optimized for Minecraft server hosting and gameplay", website: "https://intel.com", featured: false },
                    { id: 5, name: "Realms Plus", category: "Service Provider", booth: "Hall C - Booth 301", description: "Minecraft Realms hosting service with exclusive content and marketplace access", website: "https://minecraft.net/realms", featured: true }
                ];

                return {
                    messageVersion: "1.0",
                    response: {
                        actionGroup: event.actionGroup,
                        apiPath: event.apiPath,
                        httpMethod: event.httpMethod,
                        httpStatusCode: 200,
                        responseBody: {
                            "application/json": {
                                body: JSON.stringify({
                                    exhibitors: mockExhibitors,
                                    total: mockExhibitors.length,
                                    event: "Minecon Live 2026",
                                    source: "Fallback Data",
                                    note: "DynamoDB temporarily unavailable"
                                })
                            }
                        }
                    }
                };
            }
        }

        // Handle meeting request creation
        if (event.apiPath === '/api/meeting-requests' && event.httpMethod === 'POST') {
            console.log('Creating meeting request...');

            // Parse properties array sent by the Bedrock Agent
            const props = event.requestBody?.content?.['application/json']?.properties || [];
            const data = {};
            props.forEach(p => { data[p.name] = p.value; });

            // Session attributes carry the logged-in user's identity
            const sessionAttrs = event.sessionAttributes || {};

            const item = {
                id:              randomUUID(),
                created_date:    new Date().toISOString(),
                status:          'Pending',
                visitor_name:    sessionAttrs.userName    || data.visitor_name    || '',
                visitor_email:   sessionAttrs.userEmail   || data.visitor_email   || '',
                visitor_company: sessionAttrs.userCompany || data.visitor_company || '',
                exhibitor_name:  data.exhibitor_name  || '',
                exhibitor_booth: data.exhibitor_booth || '',
                preferred_date:  data.preferred_date  || '',
                preferred_time:  data.preferred_time  || '',
                reason:          data.reason          || '',
            };

            await docClient.send(new PutCommand({
                TableName: 'minecon_meeting_requests',
                Item: item
            }));

            console.log('Meeting request created:', item.id);

            return {
                messageVersion: "1.0",
                response: {
                    actionGroup: event.actionGroup,
                    apiPath: event.apiPath,
                    httpMethod: event.httpMethod,
                    httpStatusCode: 201,
                    responseBody: {
                        "application/json": {
                            body: JSON.stringify({
                                id: item.id,
                                status: item.status,
                                message: 'Meeting request submitted successfully'
                            })
                        }
                    }
                }
            };
        }

        // Handle schedule API path
        if (event.apiPath === '/api/schedule') {
            console.log('Fetching event schedule...');

            const schedule = [
                { id: 1, title: "Opening Ceremony", startTime: "2026-06-19T10:00:00Z", endTime: "2026-06-19T11:00:00Z", location: "Main Stage", description: "Welcome to Minecon Live 2026!" },
                { id: 2, title: "Minecraft 1.22 Update Showcase", startTime: "2026-06-19T14:00:00Z", endTime: "2026-06-19T15:30:00Z", location: "Main Stage", description: "Deep dive into the new features" },
                { id: 3, title: "Community Showcase", startTime: "2026-06-19T16:00:00Z", endTime: "2026-06-19T17:00:00Z", location: "Community Hall", description: "Amazing community creations" }
            ];

            return {
                messageVersion: "1.0",
                response: {
                    actionGroup: event.actionGroup,
                    apiPath: event.apiPath,
                    httpMethod: event.httpMethod,
                    httpStatusCode: 200,
                    responseBody: {
                        "application/json": {
                            body: JSON.stringify({
                                schedule: schedule,
                                total: schedule.length,
                                event: "Minecon Live 2026"
                            })
                        }
                    }
                }
            };
        }

        // Handle unknown API paths
        console.log(`Unknown API path: ${event.apiPath}`);
        return {
            messageVersion: "1.0",
            response: {
                actionGroup: event.actionGroup,
                apiPath: event.apiPath,
                httpMethod: event.httpMethod,
                httpStatusCode: 404,
                responseBody: {
                    "application/json": {
                        body: JSON.stringify({
                            error: `API path ${event.apiPath} not found`,
                            availablePaths: [
                                "/api/announcements",
                                "/api/exhibitors",
                                "/api/meeting-requests",
                                "/api/schedule"
                            ],
                            message: "Please use one of the available API endpoints"
                        })
                    }
                }
            }
        };

    } catch (error) {
        console.error('Error processing request:', error);

        return {
            messageVersion: "1.0",
            response: {
                actionGroup: event.actionGroup,
                apiPath: event.apiPath,
                httpMethod: event.httpMethod,
                httpStatusCode: 500,
                responseBody: {
                    "application/json": {
                        body: JSON.stringify({
                            error: "Internal server error",
                            message: error.message,
                            timestamp: new Date().toISOString()
                        })
                    }
                }
            }
        };
    }
};
