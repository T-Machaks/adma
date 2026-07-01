import { Router } from 'express';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const router = Router();

const bedrockAgent = new BedrockAgentRuntimeClient({ region: 'us-east-1' });

const rawDdb = new DynamoDBClient({ region: 'af-south-1' });
const ddb = DynamoDBDocumentClient.from(rawDdb, { marshallOptions: { removeUndefinedValues: true } });

const AGENT_ID    = '6KLVWZQPR7';
const AGENT_ALIAS = 'IOIIMEPX6A';
const TABLE       = 'adma_meeting_requests';

router.post('/', async (req, res) => {
  try {
    const { message, sessionId, userName, userEmail, userRole, userCompany } = req.body;
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'message and sessionId required' });
    }

    const sessionAttributes = {};
    if (userName)    sessionAttributes.userName    = userName;
    if (userEmail)   sessionAttributes.userEmail   = userEmail;
    if (userRole)    sessionAttributes.userRole    = userRole;
    if (userCompany) sessionAttributes.userCompany = userCompany;

    const text = await invokeAgent(sessionId, message, sessionAttributes);
    res.json({ content: text });
  } catch (e) {
    console.error('Chat error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * Invoke the Bedrock Agent and handle any Return Control events (action group
 * invocations) directly in the server instead of going through Lambda.
 *
 * Requires the action group executor in AWS Bedrock Console to be set to
 * "Return control" (not Lambda).
 */
async function invokeAgent(sessionId, inputText, sessionAttributes, sessionState = {}) {
  const state = Object.keys(sessionAttributes).length > 0
    ? { sessionAttributes, ...sessionState }
    : sessionState;

  const response = await bedrockAgent.send(new InvokeAgentCommand({
    agentId:      AGENT_ID,
    agentAliasId: AGENT_ALIAS,
    sessionId,
    inputText,
    ...(Object.keys(state).length > 0 && { sessionState: state }),
  }));

  let text = '';
  let returnControl = null;

  for await (const event of response.completion) {
    if (event.chunk?.bytes) {
      text += new TextDecoder().decode(event.chunk.bytes);
    }
    if (event.returnControl) {
      returnControl = event.returnControl;
    }
  }

  if (!returnControl) return text;

  // Agent wants to invoke an action — handle it here, then send results back.
  const { invocationId, invocationInputs = [] } = returnControl;
  const results = await Promise.all(invocationInputs.map(input => handleAction(input, sessionAttributes)));

  return invokeAgent(sessionId, '', sessionAttributes, {
    invocationId,
    returnControlInvocationResults: results,
  });
}

async function handleAction(invocationInput, sessionAttributes) {
  // API-schema action group (OpenAPI / REST style)
  if (invocationInput.apiInvocationInput) {
    const { actionGroup, apiPath, httpMethod, requestBody } = invocationInput.apiInvocationInput;

    if (apiPath === '/meeting-requests' && httpMethod === 'POST') {
      const props = requestBody?.content?.['application/json']?.properties ?? [];
      const data  = Object.fromEntries(props.map(({ name, value }) => [name, value]));
      const item  = await createMeetingRequest(data, sessionAttributes);

      return {
        apiResult: {
          actionGroup,
          apiPath,
          httpMethod,
          httpStatusCode: 201,
          responseBody: {
            'application/json': {
              body: JSON.stringify({ id: item.id, status: item.status }),
            },
          },
        },
      };
    }

    return {
      apiResult: {
        actionGroup, apiPath, httpMethod,
        httpStatusCode: 404,
        responseBody: { 'application/json': { body: JSON.stringify({ error: 'Not found' }) } },
      },
    };
  }

  // Function-definition action group
  if (invocationInput.functionInvocationInput) {
    const { actionGroup, function: funcName, parameters = [] } = invocationInput.functionInvocationInput;
    const data = Object.fromEntries(parameters.map(({ name, value }) => [name, value]));

    const isMeetingFn = /create.*meeting|book.*meeting/i.test(funcName);
    if (isMeetingFn) {
      const item = await createMeetingRequest(data, sessionAttributes);
      return {
        functionResult: {
          actionGroup,
          function: funcName,
          responseBody: {
            TEXT: { body: `Meeting request created. ID: ${item.id}. Status: Pending.` },
          },
        },
      };
    }

    return {
      functionResult: {
        actionGroup,
        function: funcName,
        responseBody: { TEXT: { body: 'Action not handled.' } },
      },
    };
  }

  return {};
}

async function createMeetingRequest(data, sessionAttributes) {
  const item = {
    id:              randomUUID(),
    created_date:    new Date().toISOString(),
    status:          'Pending',
    visitor_name:    sessionAttributes.userName    || data.visitor_name    || '',
    visitor_email:   sessionAttributes.userEmail   || data.visitor_email   || '',
    visitor_company: sessionAttributes.userCompany || data.visitor_company || '',
    exhibitor_name:  data.exhibitor_name  || '',
    exhibitor_booth: data.exhibitor_booth || '',
    preferred_date:  data.preferred_date  || '',
    preferred_time:  data.preferred_time  || '',
    reason:          data.reason          || '',
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  console.log('Meeting request created:', item.id);
  return item;
}

export default router;
