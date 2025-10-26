#!/usr/bin/env node
/**
 * Lava Integration Test
 * 
 * This script tests if Lava Payments is correctly configured and working.
 * Tests both OpenAI and Gemini routing through Lava.
 * Run: node test-lava.js
 */

require('dotenv').config({ path: '.env.local' });

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
};

function log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

function checkEnvVar(name, required = true) {
    const value = process.env[name];
    if (!value) {
        if (required) {
            log(`  ✗ ${name}: Missing`, 'red');
        } else {
            log(`  ○ ${name}: Not set (optional)`, 'gray');
        }
        return false;
    }
    const display = value.length > 20 ? `${value.slice(0, 20)}...` : value;
    log(`  ✓ ${name}: ${display}`, 'green');
    return true;
}

async function testOpenAILava() {
    log('\n🤖 Testing OpenAI via Lava...', 'blue');

    const token = process.env.LAVA_FORWARD_TOKEN;

    if (!token) {
        log('  ⚠ Skipped - LAVA_FORWARD_TOKEN not set', 'yellow');
        return null;
    }

    try {
        log(`  → Sending test request to OpenAI via Lava...`, 'gray');

        const response = await fetch('https://api.lavapayments.com/v1/forward/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'Say "OpenAI test successful" in exactly 3 words.' }],
                max_tokens: 10
            })
        });

        const requestId = response.headers.get('x-lava-request-id');

        if (!response.ok) {
            const errorText = await response.text();
            log(`  ✗ OpenAI via Lava error (${response.status}): ${errorText}`, 'red');
            return false;
        }

        const data = await response.json();
        const aiResponse = data?.choices?.[0]?.message?.content;

        log(`  ✓ OpenAI via Lava working!`, 'green');
        log(`  ✓ AI Response: "${aiResponse}"`, 'green');
        if (requestId) {
            log(`  ✓ Request ID: ${requestId}`, 'green');
        }

        return true;
    } catch (error) {
        log(`  ✗ OpenAI connection error: ${error.message}`, 'red');
        return false;
    }
}

async function testGeminiLava() {
    log('\n✨ Testing Gemini via Lava...', 'blue');

    const token = process.env.LAVA_FORWARD_TOKEN;
    const baseUrl = process.env.LAVA_BASE_URL || 'https://api.lavapayments.com/v1';

    if (!token) {
        log('  ⚠ Skipped - LAVA_FORWARD_TOKEN not set', 'yellow');
        return null;
    }

    try {
        const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        const lavaUrl = `${baseUrl}/forward?u=${encodeURIComponent(geminiUrl)}`;

        log(`  → Sending test request to Gemini via Lava...`, 'gray');

        const response = await fetch(lavaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'Say "Gemini test successful" in exactly 3 words.' }]
                }],
                generationConfig: { maxOutputTokens: 10 }
            })
        });

        const requestId = response.headers.get('x-lava-request-id');

        if (!response.ok) {
            const errorText = await response.text();
            log(`  ✗ Gemini via Lava error (${response.status}): ${errorText}`, 'red');

            if (response.status === 401) {
                log('\n💡 Tip: Check your LAVA_FORWARD_TOKEN is correct', 'yellow');
                log('   Get it from: https://www.lavapayments.com/dashboard/build/secret-keys', 'yellow');
            } else if (response.status === 402) {
                log('\n💡 Tip: Insufficient balance in Lava wallet', 'yellow');
                log('   Add funds at: https://www.lavapayments.com/dashboard/billing', 'yellow');
            }
            return false;
        }

        const data = await response.json();
        const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        log(`  ✓ Gemini via Lava working!`, 'green');
        log(`  ✓ AI Response: "${aiResponse}"`, 'green');
        if (requestId) {
            log(`  ✓ Request ID: ${requestId}`, 'green');
        }

        return true;
    } catch (error) {
        log(`  ✗ Gemini connection error: ${error.message}`, 'red');
        return false;
    }
}

async function main() {
    log('\n🚀 Lava Integration Verification\n', 'blue');
    log('═'.repeat(50), 'gray');

    // Step 1: Check environment variables
    log('\n1️⃣  Checking Environment Variables:', 'blue');
    const hasLavaToken = checkEnvVar('LAVA_FORWARD_TOKEN');
    checkEnvVar('LAVA_BASE_URL', false);
    checkEnvVar('GEMINI_API_KEY', false);
    checkEnvVar('OPENAI_API_KEY', false);

    // Step 2: Determine mode
    log('\n2️⃣  Integration Mode:', 'blue');
    if (hasLavaToken) {
        log('  ✓ Using Lava Payments (recommended)', 'green');
        log('  → Routes all AI requests through Lava proxy', 'gray');
        log('  → Tracks usage and costs in dashboard', 'gray');
    } else {
        log('  ⚠ Fallback to direct API calls', 'yellow');
        log('  💡 Add LAVA_FORWARD_TOKEN to use Lava', 'yellow');
    }

    // Step 3: Test connections
    if (hasLavaToken) {
        const openaiSuccess = await testOpenAILava();
        const geminiSuccess = await testGeminiLava();

        log('\n═'.repeat(50), 'gray');

        const bothSuccess = openaiSuccess && geminiSuccess;
        const anySuccess = openaiSuccess || geminiSuccess;

        if (bothSuccess) {
            log('\n✅ SUCCESS! Both OpenAI and Gemini working through Lava.\n', 'green');
            log('Next steps:', 'blue');
            log('  1. Run your app: npm run dev', 'gray');
            log('  2. Play any game to test the integration', 'gray');
            log('  3. Check usage in dashboard:', 'gray');
            log('     https://www.lavapayments.com/dashboard/monetize/explore\n', 'gray');
        } else if (anySuccess) {
            log('\n⚠️  PARTIAL SUCCESS: Some providers working.\n', 'yellow');
            log('Troubleshooting:', 'yellow');
            log('  1. Check your Lava wallet has sufficient funds', 'gray');
            log('  2. Verify token permissions at:', 'gray');
            log('     https://www.lavapayments.com/dashboard/build/secret-keys\n', 'gray');
        } else {
            log('\n❌ FAILED: Lava is not working correctly.\n', 'red');
            log('Troubleshooting:', 'yellow');
            log('  1. Verify your token at:', 'gray');
            log('     https://www.lavapayments.com/dashboard/build/secret-keys', 'gray');
            log('  2. Ensure you have funds in your Lava wallet', 'gray');
            log('  3. Check .env.local is in the project root', 'gray');
            log('  4. Restart your server after changing .env.local\n', 'gray');
        }
    } else {
        log('\n⚠️  Lava token not configured - using legacy mode\n', 'yellow');
    }
}

main().catch(err => {
    log(`\n💥 Unexpected error: ${err.message}`, 'red');
    process.exit(1);
});
