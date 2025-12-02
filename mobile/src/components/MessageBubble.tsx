import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Message } from '../types/api';
import { Colors, getColors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { Video, ResizeMode } from 'expo-av';
import Icon from 'react-native-vector-icons/Feather';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onLongPress?: (message: Message) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onLongPress,
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const senderName = typeof message.senderId === 'object' ? message.senderId.username : '';
  const senderAvatar = typeof message.senderId === 'object' && message.senderId.profileImageUrl
    ? message.senderId.profileImageUrl
    : senderName?.charAt(0)?.toUpperCase() || 'U';
  const time = message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  // Show reply preview if message.replyTo exists
  const replyPreview = message.replyTo && typeof message.replyTo === 'object' && message.replyTo.content
    ? message.replyTo.content
    : undefined;

  // Long press menu for reply, edit, delete
  const handleLongPress = () => {
    if (!isOwn && !onReply) return;
    const options = [
      ...(onReply ? ['Reply'] : []),
      ...(isOwn && onEdit ? ['Edit'] : []),
      ...(isOwn && onDelete ? ['Delete'] : []),
      'Cancel',
    ];
    Alert.alert(
      'Message Options',
      '',
      options.map((option, idx) => ({
        text: option,
        onPress: () => {
          if (option === 'Reply' && onReply) onReply(message);
          if (option === 'Edit' && onEdit) onEdit(message);
          if (option === 'Delete' && onDelete) onDelete(message);
        },
        style: option === 'Cancel' ? 'cancel' : 'default',
      }))
    );
    onLongPress?.(message);
  };

  return (
    <View style={[styles.row, isOwn && { flexDirection: 'row-reverse' }]}> 
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <View style={[
          styles.avatar, 
          { backgroundColor: isOwn ? Colors.primary[500] : colors.neutral[400] }
        ]} accessibilityLabel={`Avatar of ${senderName || (isOwn ? 'You' : 'Other')}`}> 
          <Text style={styles.avatarText}>{typeof senderAvatar === 'string' ? senderAvatar : 'U'}</Text>
        </View>
      </View>
      {/* Bubble */}
      <TouchableOpacity
        onLongPress={handleLongPress}
        activeOpacity={0.85}
        style={[
          styles.bubble, 
          { 
            backgroundColor: isOwn 
              ? (theme === 'dark' ? Colors.primary[700] : Colors.primary[100])
              : (theme === 'dark' ? colors.neutral[800] : colors.neutral[100])
          }
        ]}
        accessibilityLabel={`Message from ${senderName || (isOwn ? 'You' : 'Other')}: ${message.content}`}
      >
        {/* Sender name (optional, e.g. for group chat) */}
        {!isOwn && senderName ? (
          <Text style={[styles.sender, { color: colors.text.secondary }]}>{senderName}</Text>
        ) : null}
        {/* Reply preview */}
        {replyPreview && (
          <View style={[styles.replyPreview, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.replyPreviewText, { color: colors.text.secondary }]} numberOfLines={1}>
              Replying to: {replyPreview}
            </Text>
          </View>
        )}
        {/* Message content */}
        {message.content && (
          <Text style={[styles.content, { color: colors.text.primary }]}>{message.content}</Text>
        )}
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            {message.attachments.map((att, idx) => {
              if (att.type === 'image') {
                return (
                  <View key={idx} style={styles.mediaContainer}>
                    <Image 
                      source={{ uri: att.url }} 
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                    {att.name && (
                      <Text style={[styles.mediaName, { color: colors.text.secondary }]}>
                        {att.name}
                      </Text>
                    )}
                  </View>
                );
              } else if (att.type === 'video') {
                return (
                  <View key={idx} style={styles.mediaContainer}>
                    <View style={styles.videoContainer}>
                      <Video
                        source={{ uri: att.url }}
                        style={styles.videoPlayer}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={false}
                        shouldCorrectPitch={false}
                        progressUpdateIntervalMillis={1000}
                        onError={(error) => {
                          console.log('Message video error:', error);
                        }}
                        onLoad={() => {
                          console.log('Message video loaded successfully');
                        }}
                      />
                      {/* Play button overlay */}
                      <View style={styles.playButtonOverlay}>
                        <Icon name="play" size={20} color="#fff" />
                      </View>
                      {/* Duration overlay */}
                      {att.duration && (
                        <View style={styles.durationOverlay}>
                          <Text style={styles.durationText}>
                            {Math.floor(att.duration / 60)}:{(att.duration % 60).toString().padStart(2, '0')}
                          </Text>
                        </View>
                      )}
                    </View>
                    {att.name && (
                      <Text style={[styles.mediaName, { color: colors.text.secondary }]}>
                        {att.name}
                      </Text>
                    )}
                  </View>
                );
              }
              return null;
            })}
          </View>
        )}
        <View style={styles.metaRow}>
          <Text style={[styles.time, { color: colors.text.secondary }]}>{time}</Text>
          {/* TODO: show read/delivered status, reactions, etc. */}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  avatarWrapper: {
    marginHorizontal: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    // backgroundColor will be set dynamically
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  avatarText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    // backgroundColor will be set dynamically
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    flexShrink: 1,
  },
  sender: {
    fontSize: 13,
    // color will be set dynamically
    fontWeight: '600',
    marginBottom: 2,
  },
  replyPreview: {
    // backgroundColor will be set dynamically
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  replyPreviewText: {
    fontSize: 12,
    // color will be set dynamically
    fontStyle: 'italic',
  },
  content: {
    fontSize: 16,
    // color will be set dynamically
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  time: {
    fontSize: 12,
    // color will be set dynamically
    marginLeft: 8,
  },
  attachmentsContainer: {
    marginTop: 8,
    gap: 6,
  },
  mediaContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  attachmentImage: {
    width: 160,
    height: 160,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  videoContainer: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  mediaName: {
    fontSize: 11,
    marginTop: 2,
    marginHorizontal: 6,
    marginBottom: 6,
    opacity: 0.8,
  },
}); 