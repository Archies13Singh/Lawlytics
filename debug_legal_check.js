// Debug script to test isLegalDocument function
import { legalModel } from './src/utils/vertexClient.js';

function safeJsonParse(s) {
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = s.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      for (let i = end; i > start; i--) {
        try {
          return JSON.parse(s.slice(start, i));
        } catch {}
      }
    }
  }
  const jsonMatch = s.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  return JSON.parse(s);
}

async function isLegalDocument(text) {
  const prompt = `
You are a classifier. Determine if the following document is a legal document or not.
Answer with STRICT JSON ONLY:
{
  "isLegal": true|false,
  "reason": "string"
}
Document:
"""${text.slice(0, 1000)}"""
Rules:
- Answer only with JSON, no extra text.
- If the document is legal, "isLegal" should be true, else false.
- Provide a brief reason.
`.trim();

  console.log('Prompt being sent:');
  console.log(prompt);
  console.log('\n=================\n');

  try {
    const resp = await legalModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 100,
      },
      safetySettings: [],
    });
    
    console.log('Full response object:');
    console.log(JSON.stringify(resp, null, 2));
    console.log('\n=================\n');
    
    const textResp = resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Raw text response:');
    console.log(textResp);
    console.log('\n=================\n');
    
    const parsed = safeJsonParse(textResp);
    console.log('Parsed JSON:');
    console.log(parsed);
    console.log('\n=================\n');
    
    return parsed.isLegal === true;
  } catch (error) {
    console.error('Error in isLegalDocument:', error);
    return false;
  }
}

// Test with sample rental agreement text
const sampleRentalText = `
RENTAL AGREEMENT

This Rental Agreement is entered into on [Date] between [Landlord Name], the Landlord, and [Tenant Name], the Tenant.

PROPERTY DESCRIPTION:
The property being rented is located at [Property Address].

TERM:
This agreement shall commence on [Start Date] and end on [End Date].

RENT:
The monthly rent is $[Amount] due on the [Day] of each month.

SECURITY DEPOSIT:
A security deposit of $[Amount] is required.

MAINTENANCE:
The tenant is responsible for minor repairs and maintenance.

TERMINATION:
Either party may terminate this agreement with 30 days written notice.

GOVERNING LAW:
This agreement shall be governed by the laws of [State].

Landlord Signature: ___________________ Date: ___________
Tenant Signature: ___________________ Date: ___________
`;

console.log('Testing with sample rental agreement text...');
isLegalDocument(sampleRentalText).then(result => {
  console.log('Final result:', result);
}).catch(error => {
  console.error('Test failed:', error);
});
