#!/usr/bin/env node
/**
 * Lava Integration Test
 * 
 * This script tests if Lava Payments is correctly configured and working.
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
        log(`  ✗ ${name}: Missing`, 'red');
        return false;
    }
    const display = value.length > 20 ? `${value.slice(0, 20)}...` : value;
    log(`  ✓ ${name}: ${display}`, 'green');
    return true;
}

async function testLavaConnection() {
    log('\n🧪 Testing Lava API Connection...', 'blue');

    const token = process.env.LAVA_FORWARD_TOKEN;
    const baseUrl = process.env.LAVA_BASE_URL || 'https://api.lavapayments.com/v1';

    if (!token) {
        log('  ✗ Cannot test - LAVA_FORWARD_TOKEN not set', 'red');
        return false;
    }

    try {
        // Test with a minimal Gemini request through Lava
        const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        const lavaUrl = `${baseUrl}/forward?u=${encodeURIComponent(geminiUrl)}`;

        log(`  → Sending test request to Lava...`, 'gray');

        const response = await fetch(lavaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'Say "Lava test successful" in exactly 3 words.' }]
                }],
                generationConfig: { maxOutputTokens: 10 }
            })
        });

        const requestId = response.headers.get('x-lava-request-id');

        if (!response.ok) {
            const errorText = await response.text();
            log(`  ✗ Lava API error (${response.status}): ${errorText}`, 'red');

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

        log(`  ✓ Lava proxy working!`, 'green');
        log(`  ✓ AI Response: "${aiResponse}"`, 'green');

        if (requestId) {
            log(`  ✓ Request ID: ${requestId}`, 'green');
            log(`\n📊 View in dashboard:`, 'blue');
            log(`   https://www.lavapayments.com/dashboard/monetize/explore`, 'gray');
        }

        return true;
    } catch (error) {
        log(`  ✗ Connection error: ${error.message}`, 'red');
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

    // Step 2: Determine mode
    log('\n2️⃣  Integration Mode:', 'blue');
    if (hasLavaToken) {
        log('  ✓ Using Lava Payments (recommended)', 'green');
    } else {
        log('  ⚠ Fallback to direct Gemini API', 'yellow');
        log('  💡 Add LAVA_FORWARD_TOKEN to use Lava', 'yellow');
    }

    // Step 3: Test connection
    if (hasLavaToken) {
        const success = await testLavaConnection();

        log('\n═'.repeat(50), 'gray');
        if (success) {
            log('\n✅ SUCCESS! Lava is working correctly.\n', 'green');
            log('Next steps:', 'blue');
            log('  1. Run your app: npm run dev', 'gray');
            log('  2. Play the Image Similarity game', 'gray');
            log('  3. Check usage in dashboard:', 'gray');
            log('     https://www.lavapayments.com/dashboard/monetize/explore\n', 'gray');
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
