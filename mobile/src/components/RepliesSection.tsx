import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { commentsAPI } from '../services/api/comments';
import { Comment } from './Comment';
import { Colors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';

interface RepliesSectionProps {
  commentId: string;
  replyCount: number;
  postId: string;
  onReplyCreated?: (reply: any) => void;
}

export function RepliesSection({ commentId, replyCount, postId, onReplyCreated }: RepliesSectionProps) {
  const { isSignedIn } = useAuth();
  
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReplies = async () => {
    if (hasFetched) return;
    
    setLoading(true);
    setError(null);
    try {
      if (!isSignedIn) {
        throw new Error('Please sign in to view replies.');
      }

      const response = await commentsAPI.getReplies(undefined, commentId);
      setReplies(response.replies || []);
      setHasFetched(true);
    } catch (error: any) {
      setError(error.message || 'Failed to load replies');
      console.error('Failed to fetch replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReplies = () => {
    if (!isExpanded && !hasFetched) {
      fetchReplies();
    }
    setIsExpanded(!isExpanded);
  };

  const handleReplyCreated = (reply: any) => {
    setReplies(prev => [reply, ...prev]);
    onReplyCreated?.(reply);
  };

  const handleReplyUpdate = (updatedReply: any) => {
    setReplies(prev => prev.map(reply => 
      reply._id === updatedReply._id ? updatedReply : reply
    ));
  };

  const handleReplyDelete = (replyId: string) => {
    setReplies(prev => prev.filter(reply => reply._id !== replyId));
  };

  const renderReply = ({ item }: { item: any }) => (
    <View style={styles.replyWrapper}>
      <Comment
        comment={item}
        onCommentUpdate={handleReplyUpdate}
        onCommentDelete={handleReplyDelete}
        onReplyCreated={handleReplyCreated}
      />
    </View>
  );

  if (replyCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.toggleButton} 
        onPress={handleToggleReplies}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.replyLine} />
        <Icon 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={Colors.primary[500]} 
        />
        <Text style={styles.toggleText}>
          {isExpanded ? 'Hide' : 'Show'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.repliesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary[500]} />
              <Text style={styles.loadingText}>Loading replies...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchReplies} style={styles.retryButton}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={replies}
              renderItem={renderReply}
              keyExtractor={(item, index) => item?._id || `reply-${index}`}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false} // Disable nested scrolling
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 44, // Align with comment content
    marginTop: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  replyLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.neutral[300],
    borderRadius: 1,
  },
  toggleText: {
    fontSize: 13,
    color: Colors.primary[500],
    fontWeight: '500',
  },
  repliesContainer: {
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: Colors.neutral[200],
    paddingLeft: 12,
  },
  replyWrapper: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error[500],
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: Colors.background.primary,
    fontSize: 14,
    fontWeight: '500',
  },
}); 