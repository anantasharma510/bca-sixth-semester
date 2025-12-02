var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class ContentFilterService {
    constructor(options = {}) {
        // Add custom filter words
        this.customFilterWords = [
            // Common social media inappropriate terms
            'kill yourself',
            'kys',
            'die',
            'suicide',
            'self harm',
            'cut yourself',
            'hang yourself',
            // Hate speech patterns
            'you should die',
            'go die',
            'end yourself',
            // Profanity and offensive terms
            'fuck',
            'shit',
            'bitch',
            'asshole',
            'damn',
            'hell',
            'bastard',
            'crap',
            'piss',
            'dick',
            'cock',
            'pussy',
            'cunt',
            'whore',
            'slut',
            'fag',
            'faggot',
            'retard',
            'nigger',
            'nigga',
            'chink',
            'spic',
            'kike',
            'dyke',
            'tranny',
            // Sexual content
            'porn',
            'pornography',
            'sex',
            'sexual',
            'nude',
            'naked',
            'xxx',
            'nsfw',
            'onlyfans',
            // Violence
            'kill',
            'murder',
            'rape',
            'torture',
            'abuse',
            // Spam/Scam
            'click here',
            'free money',
            'make money fast',
            'buy followers',
            'get rich quick',
            ...(options.customWords || [])
        ];
        this.whitelistWords = [
            // Common false positives
            'grass',
            'class',
            'pass',
            'classic',
            'assassin',
            'passionate',
            'assumption',
            ...(options.customWhitelist || [])
        ];
    }
    /**
     * Filter text content for inappropriate language
     */
    filterText(text_1) {
        return __awaiter(this, arguments, void 0, function* (text, options = {}) {
            if (!text || text.trim().length === 0) {
                return {
                    isClean: true,
                    violations: [],
                    severity: 'none'
                };
            }
            const violations = [];
            let filteredContent = text;
            let severity = 'none';
            try {
                const lowerText = text.toLowerCase();
                // Check custom filter words
                for (const word of this.customFilterWords) {
                    // Skip if it's in whitelist
                    if (this.whitelistWords.some(w => lowerText.includes(w.toLowerCase()))) {
                        continue;
                    }
                    const wordLower = word.toLowerCase();
                    if (lowerText.includes(wordLower)) {
                        if (!violations.includes('Inappropriate content detected')) {
                            violations.push('Inappropriate content detected');
                            severity = 'high';
                        }
                        if (options.strictMode) {
                            const regex = new RegExp(word, 'gi');
                            filteredContent = filteredContent.replace(regex, '****');
                        }
                    }
                }
                // Check for hate speech patterns
                const hateSpeechPatterns = [
                    /kill\s+yourself/gi,
                    /go\s+die/gi,
                    /you\s+should\s+die/gi,
                    /end\s+yourself/gi,
                    /white\s+power/gi,
                    /heil\s+hitler/gi,
                    /gas\s+the\s+jews/gi,
                ];
                for (const pattern of hateSpeechPatterns) {
                    if (pattern.test(text)) {
                        if (!violations.includes('Hate speech detected')) {
                            violations.push('Hate speech detected');
                            severity = 'high';
                        }
                        break;
                    }
                }
                // Check for spam/scam patterns
                const spamPatterns = [
                    /click\s+here/gi,
                    /free\s+money/gi,
                    /make\s+money\s+fast/gi,
                    /buy\s+followers/gi,
                    /get\s+rich\s+quick/gi,
                    /subscribe\s+to\s+my\s+channel/gi,
                ];
                for (const pattern of spamPatterns) {
                    if (pattern.test(text)) {
                        if (!violations.includes('Spam/scam content detected')) {
                            violations.push('Spam/scam content detected');
                            severity = severity === 'none' ? 'low' : severity;
                        }
                        break;
                    }
                }
            }
            catch (error) {
                console.error('Content filtering error:', error);
                // In case of error, be conservative and block content
                return {
                    isClean: false,
                    violations: ['Content filtering error'],
                    severity: 'high',
                    message: 'Unable to verify content safety'
                };
            }
            const isClean = violations.length === 0;
            return {
                isClean,
                filteredContent: isClean ? undefined : (options.strictMode ? filteredContent : undefined),
                violations,
                severity,
                message: !isClean ? `Content blocked: ${violations.join(', ')}` : undefined
            };
        });
    }
    /**
     * Check if content contains inappropriate language (quick check)
     */
    isContentClean(text) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!text || text.trim().length === 0) {
                return true;
            }
            try {
                const result = yield this.filterText(text);
                return result.isClean;
            }
            catch (error) {
                console.error('Quick content check error:', error);
                return false; // Conservative approach
            }
        });
    }
    /**
     * Clean inappropriate language from text
     */
    cleanText(text) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!text || text.trim().length === 0) {
                return text;
            }
            try {
                const result = yield this.filterText(text, { strictMode: true });
                return result.filteredContent || text;
            }
            catch (error) {
                console.error('Text cleaning error:', error);
                return text; // Return original text if cleaning fails
            }
        });
    }
    /**
     * Get violation explanation for user
     */
    getViolationMessage(violations, severity) {
        if (violations.length === 0) {
            return '';
        }
        const messages = {
            'Profanity detected': 'Your content contains inappropriate language.',
            'Hate speech detected': 'Your content contains hate speech or harmful language.',
            'Sexual content detected': 'Your content contains inappropriate sexual references.',
            'Violence detected': 'Your content contains violent or threatening language.',
            'Spam/scam content detected': 'Your content appears to be spam or a scam.',
            'Inappropriate content detected': 'Your content violates our community guidelines.'
        };
        const firstViolation = violations[0];
        return messages[firstViolation] || 'Your content violates our community guidelines.';
    }
}
// Create singleton instance
const contentFilter = new ContentFilterService();
// Utility functions for easy use
export const filterContent = (text, options) => __awaiter(void 0, void 0, void 0, function* () {
    return contentFilter.filterText(text, options);
});
export const isCleanContent = (text) => __awaiter(void 0, void 0, void 0, function* () {
    return contentFilter.isContentClean(text);
});
export const cleanContent = (text) => __awaiter(void 0, void 0, void 0, function* () {
    return contentFilter.cleanText(text);
});
export const getViolationMessage = (violations, severity) => {
    return contentFilter.getViolationMessage(violations, severity);
};
