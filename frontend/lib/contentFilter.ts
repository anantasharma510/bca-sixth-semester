// Frontend content filtering utility for Apple App Store compliance
export interface ContentFilterResult {
  isClean: boolean;
  filteredContent?: string;
  violations: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  message?: string;
}

export interface ContentFilterOptions {
  strictMode?: boolean;
  allowPartialWords?: boolean;
  customWords?: string[];
  customWhitelist?: string[];
}

class FrontendContentFilter {
  private customFilterWords: string[];
  private whitelistWords: string[];

  constructor(options: ContentFilterOptions = {}) {
    // Custom filter words for social media
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
      // Cyberbullying terms
      'nobody likes you',
      'everyone hates you',
      'youre worthless',
      'you are worthless',
      // Sexual content (additional)
      'nude',
      'naked',
      'sex video',
      'porn',
      'pornography',
      'adult content',
      // Violence
      'beat you up',
      'hurt you',
      'attack you',
      'fight you',
      // Spam/Scam patterns
      'click here',
      'free money',
      'make money fast',
      'bitcoin investment',
      'crypto investment',
      ...(options.customWords || [])
    ];

    // Whitelist words that should never be filtered
    this.whitelistWords = [
      'class',
      'classic',
      'assassin',
      'assassinate',
      'butt',
      'butter',
      'butterfly',
      'buttercup',
      'buttermilk',
      'butterscotch',
      'buttress',
      'assume',
      'assignment',
      'assistant',
      'associate',
      'association',
      'assess',
      'assessment',
      'asset',
      'assemble',
      'assembly',
      'assert',
      'assertion',
      'assign',
      'assignment',
      'assist',
      'assistance',
      'associate',
      'association',
      'assume',
      'assumption',
      'assure',
      'assurance',
      'pass',
      'passage',
      'passenger',
      'passion',
      'passionate',
      'passive',
      'password',
      'grass',
      'grasshopper',
      'glass',
      'class',
      'mass',
      'bass',
      'brass',
      'crass',
      'embarrass',
      'embarrassment',
      'harass',
      'harassment',
      ...(options.customWhitelist || [])
    ];
  }

  /**
   * Filter text content for inappropriate language (frontend version)
   */
  async filterText(text: string, options: ContentFilterOptions = {}): Promise<ContentFilterResult> {
    if (!text || text.trim().length === 0) {
      return {
        isClean: true,
        violations: [],
        severity: 'none'
      };
    }

    const violations: string[] = [];
    let severity: 'none' | 'low' | 'medium' | 'high' = 'none';

    try {
      const lowerText = text.toLowerCase();
      
      // Check for hate speech patterns
      const hateSpeechPatterns = [
        /kill\s+yourself/i,
        /kys/i,
        /you\s+should\s+die/i,
        /go\s+die/i,
        /end\s+yourself/i,
        /nobody\s+likes\s+you/i,
        /everyone\s+hates\s+you/i,
        /youre\s+worthless/i,
        /you\s+are\s+worthless/i
      ];

      for (const pattern of hateSpeechPatterns) {
        if (pattern.test(text)) {
          violations.push('Hate speech detected');
          severity = 'high';
          break;
        }
      }

      // Check for sexual content patterns
      const sexualContentPatterns = [
        /nude\s+photo/i,
        /naked\s+picture/i,
        /sex\s+video/i,
        /porn/i,
        /pornography/i,
        /adult\s+content/i
      ];

      for (const pattern of sexualContentPatterns) {
        if (pattern.test(text)) {
          violations.push('Sexual content detected');
          severity = 'high';
          break;
        }
      }

      // Check for violence patterns
      const violencePatterns = [
        /beat\s+you\s+up/i,
        /hurt\s+you/i,
        /attack\s+you/i,
        /fight\s+you/i,
        /violence/i,
        /assault/i
      ];

      for (const pattern of violencePatterns) {
        if (pattern.test(text)) {
          violations.push('Violence detected');
          severity = severity === 'none' ? 'medium' : severity;
          break;
        }
      }

      // Check for spam/scam patterns
      const spamPatterns = [
        /click\s+here/i,
        /free\s+money/i,
        /make\s+money\s+fast/i,
        /bitcoin\s+investment/i,
        /crypto\s+investment/i,
        /guaranteed\s+profit/i
      ];

      for (const pattern of spamPatterns) {
        if (pattern.test(text)) {
          violations.push('Spam/scam content detected');
          severity = severity === 'none' ? 'low' : severity;
          break;
        }
      }

      // Check for common profanity (basic list)
      const profanityWords = [
        'fuck', 'shit', 'bitch', 'asshole', 'damn', 'hell',
        'crap', 'piss', 'dick', 'cock', 'pussy', 'whore',
        'slut', 'bastard', 'motherfucker', 'fucking', 'shitty'
      ];

      for (const word of profanityWords) {
        if (lowerText.includes(word)) {
          violations.push('Profanity detected');
          severity = severity === 'none' ? 'medium' : severity;
          break;
        }
      }

      // Check custom filter words
      for (const word of this.customFilterWords) {
        if (lowerText.includes(word.toLowerCase())) {
          violations.push('Inappropriate content detected');
          severity = severity === 'none' ? 'medium' : severity;
          break;
        }
      }

    } catch (error) {
      console.error('Frontend content filtering error:', error);
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
      violations,
      severity,
      message: !isClean ? `Content blocked: ${violations.join(', ')}` : undefined
    };
  }

  /**
   * Quick check if content contains inappropriate language
   */
  async isContentClean(text: string): Promise<boolean> {
    if (!text || text.trim().length === 0) {
      return true;
    }

    try {
      const lowerText = text.toLowerCase();
      
      // Quick checks for obvious violations
      const quickChecks = [
        /kill\s+yourself/i,
        /kys/i,
        /you\s+should\s+die/i,
        /fuck/i,
        /shit/i,
        /bitch/i,
        /porn/i,
        /nude/i
      ];

      for (const pattern of quickChecks) {
        if (pattern.test(text)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Quick content check error:', error);
      return false; // Conservative approach
    }
  }

  /**
   * Clean inappropriate language from text
   */
  async cleanText(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return text;
    }

    try {
      const result = await this.filterText(text, { strictMode: true });
      return result.filteredContent || text;
    } catch (error) {
      console.error('Text cleaning error:', error);
      return text; // Return original text if cleaning fails
    }
  }

  /**
   * Get violation explanation for user
   */
  getViolationMessage(violations: string[], severity: string): string {
    const messages = {
      'low': 'Your content contains potentially inappropriate language. Please review and edit your message.',
      'medium': 'Your content contains inappropriate language and cannot be posted. Please remove offensive content.',
      'high': 'Your content violates our community guidelines and cannot be posted. Please ensure your content is appropriate.'
    };

    const baseMessage = messages[severity as keyof typeof messages] || messages['medium'];
    
    if (violations.length > 0) {
      return `${baseMessage} Detected: ${violations.join(', ')}`;
    }
    
    return baseMessage;
  }
}

// Export singleton instance
export const contentFilter = new FrontendContentFilter();

// Export class for custom instances
export { FrontendContentFilter };

// Utility functions for easy use
export const filterContent = async (text: string, options?: ContentFilterOptions): Promise<ContentFilterResult> => {
  return contentFilter.filterText(text, options);
};

export const isCleanContent = async (text: string): Promise<boolean> => {
  return contentFilter.isContentClean(text);
};

export const cleanContent = async (text: string): Promise<string> => {
  return contentFilter.cleanText(text);
};

export const getViolationMessage = (violations: string[], severity: string): string => {
  return contentFilter.getViolationMessage(violations, severity);
};
