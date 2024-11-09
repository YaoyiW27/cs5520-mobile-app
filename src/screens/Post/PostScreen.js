import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  StyleSheet, 
  SafeAreaView,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext'; 
import { 
  getAllPosts, 
  toggleLike, 
  addComment, 
  deletePost 
} from '../../Firebase/postHelper';

const Comment = ({ comment }) => (
  <View style={styles.commentContainer}>
    <View style={styles.commentHeader}>
      <View style={styles.commentUserInfo}>
        {comment.userAvatar ? (
          <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatar} />
        ) : (
          <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={16} color="#666" />
          </View>
        )}
        <View>
          <Text style={styles.commentUsername}>{comment.username}</Text>
          <Text style={styles.commentTime}>{comment.time}</Text>
        </View>
      </View>
    </View>
    <Text style={styles.commentText}>{comment.text}</Text>
  </View>
);

const PostCard = ({ post, onLike, onComment, onDelete, currentUserId }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(commentText);
      setCommentText('');
      // Keep the comment section open after submitting
      setShowCommentInput(false);
      setShowComments(true);
    }
  };
  
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <TouchableOpacity style={styles.avatar}>
            {post.userAvatar ? (
              <Image source={{ uri: post.userAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={20} color="#666" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.userTextInfo}>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.time}>{post.time}</Text>
          </View>
        </View>
        {currentUserId === post.userId && (
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => onDelete(post.id)}
          >
            <Ionicons name="trash-outline" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.content}>{post.content}</Text>
      
      {post.media && post.media.length > 0 && (
        <View style={styles.mediaContainer}>
          <Image 
            source={{ uri: post.media[0] }}  
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </View>
      )}
      
      <View style={styles.footer}>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onLike}>
            <Ionicons 
              name={post.isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={post.isLiked ? "#FF69B4" : "#666"} 
            />
            <Text style={styles.actionText}>{post.likes || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setShowComments(!showComments);
              setShowCommentInput(!showComments);
            }}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#666" />
            <Text style={styles.actionText}>
              {post.comments ? post.comments.length : 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {(showComments || showCommentInput) && (
        <View style={styles.commentsSection}>
          {showCommentInput && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentTextInput}
                  placeholder="Write a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity 
                  style={[
                    styles.commentSendButton,
                    !commentText.trim() && styles.sendButtonDisabled
                  ]}
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim()}
                >
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={commentText.trim() ? "#FF69B4" : "#ccc"} 
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}

          {showComments && post.comments && post.comments.length > 0 && (
            <ScrollView style={styles.commentsList}>
              {post.comments.map((comment, index) => (
                <View key={index} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    {comment.userAvatar ? (
                      <Image 
                        source={{ uri: comment.userAvatar }} 
                        style={styles.commentAvatar} 
                      />
                    ) : (
                      <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={16} color="#666" />
                      </View>
                    )}
                    <View style={styles.commentUserInfo}>
                      <Text style={styles.commentUsername}>{comment.username}</Text>
                      <Text style={styles.commentTime}>
                        {comment.createdAt ? 
                          new Date(comment.createdAt.seconds * 1000).toLocaleString() : 
                          'Just now'
                        }
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const PostScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch posts when component mounts or when returning to screen
  useEffect(() => {
    fetchPosts();

    // Add listener for when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPosts();
    });

    return unsubscribe;
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const allPosts = await getAllPosts();
      // Format posts data
      const formattedPosts = allPosts.map(post => ({
        ...post,
        isLiked: post.likedBy?.includes(user.email) || false,
        likes: post.likesCount || 0,
        time: formatTime(post.createdAt)
      }));
      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const isLiked = await toggleLike(postId, user.email);
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked,
            likes: isLiked ? post.likes + 1 : post.likes - 1
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handleComment = async (postId, commentText) => {
    try {
      const newComment = await addComment(postId, user.email, commentText);
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), {
              ...newComment,
              time: 'Just now'
            }]
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId, user.email);
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  // Helper function to format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const postTime = timestamp.toDate();
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard 
            post={item}
            onLike={() => handleLike(item.id)}
            onComment={(text) => handleComment(item.id, text)}
            onDelete={() => handleDelete(item.id)}
            currentUserId={user.email}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={fetchPosts}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    marginVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTextInfo: {
    marginLeft: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 15,
    paddingVertical: 10,  
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  mediaContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    color: '#666',
    fontSize: 14,
  },
  moreButton: {
    padding: 5,
  },
  commentsSection: {
    backgroundColor: '#f9f9f9',
    maxHeight: 300,
  },
  commentsList: {
    padding: 15,
    maxHeight: 250,
  },
  commentInput: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    padding: 0,
  },
  sendButton: {
    padding: 5,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    padding: 10,
  },
  // New comment styles
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  commentSendButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentItem: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  commentUserInfo: {
    flex: 1,
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
  },
  commentContent: {
    fontSize: 14,
    marginLeft: 40,
    color: '#333',
  }
});

export default PostScreen;