import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface PrivacyPolicyScreenProps {
  navigation?: any;
}

export default function PrivacyPolicyScreen({ navigation: navigationProp }: PrivacyPolicyScreenProps) {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const navigationHook = useNavigation<any>();
  const navigation = navigationProp ?? navigationHook;
  const sections = useMemo(
    () => [
      {
        title: '一、引言',
        paragraphs: [
          'AIRWIG（以下简称“本平台”）尊重并保护所有使用者的个人信息安全。本《隐私政策》旨在向您清晰说明我们如何收集、使用、存储、共享及保护您的个人信息。',
          '本政策适用并受《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》等相关法律法规约束。'
        ],
      },
      {
        title: '二、我们收集的信息',
        paragraphs: [
          '在您使用服务过程中，我们将根据合法、正当、必要原则收集以下信息：'
        ],
        list: [
          '账号信息：昵称、头像、手机号、电子邮箱、用户名等您在注册及完善资料时提供的内容；',
          '用户内容：您发布的文字、图片、视频、音频、评论、点赞、消息及其他交互数据；',
          '设备与日志信息：设备型号、操作系统、唯一设备标识符、网络信息、IP 地址、位置信息（在您授权时）以及访问日志；',
          '客服信息：您在反馈、申诉或联系客服时提供的对话记录、联系方式及凭证材料。'
        ],
      },
      {
        title: '三、信息使用目的',
        paragraphs: ['我们会在以下情形中使用您的个人信息：'],
        list: [
          '提供、维护及优化平台功能与服务体验；',
          '验证身份、保障账号及交易安全、防范欺诈与风险；',
          '向您发送通知、提醒、更新及服务相关信息；',
          '协助内容审核、违规处理与投诉反馈；',
          '开展数据分析以改进产品，并在法律允许范围内进行个性化推荐；',
          '履行法律法规义务或监管要求。'
        ],
      },
      {
        title: '四、Cookie 与同类技术',
        paragraphs: [
          '为提升体验，我们可能使用 Cookie、SDK、像素标签等技术收集您的偏好与使用习惯，以便提供安全、流畅的服务。您可在浏览器或设备中管理相关权限，但可能因此无法享受某些功能。'
        ],
      },
      {
        title: '五、信息共享、转移与公开披露',
        paragraphs: [
          '我们不会向任何第三方出售个人信息，仅在下列情形共享或转移：'
        ],
        list: [
          '获得您明示同意或授权；',
          '与受托合作伙伴共享，用于提供支付、云存储、数据分析等服务，且其须受本政策与保密协议约束；',
          '履行法律法规、司法或监管要求；',
          '为维护公共利益、处理紧急事件或保护我们及其他用户的人身、财产安全。'
        ],
      },
      {
        title: '六、信息存储与安全',
        paragraphs: [
          '我们在中华人民共和国境内存储收集的个人信息，并采用加密、访问控制、审计等安全措施防止信息被未授权访问、泄露、篡改或丢失。',
          '如需跨境传输，我们将按照法律法规履行评估、备案及取得您的单独同意。'
        ],
      },
      {
        title: '七、您的权利',
        paragraphs: [
          '您可通过账号设置或联系客服行使以下权利：'
        ],
        list: [
          '访问与复制：查看或复制您的个人信息；',
          '更正与补充：更新不准确或不完整的信息；',
          '删除：在符合法定条件时申请删除相关数据或注销账号；',
          '撤回同意：撤回对特定业务功能的授权，但可能影响相关服务体验；',
          '获取解释：了解个人信息处理规则及安全影响评估摘要。'
        ],
      },
      {
        title: '八、未成年人保护',
        paragraphs: [
          '若您为未成年人，应在监护人同意与指导下使用本平台。我们将按照法律要求加强未成年人个人信息保护，并提供投诉渠道。'
        ],
      },
      {
        title: '九、政策更新',
        paragraphs: [
          '我们可能根据业务、法律或监管要求对本政策进行更新。重大变更将通过站内信、弹窗或公告形式通知您，更新后的政策自公布之日起生效。'
        ],
      },
      {
        title: '十、联系我们',
        paragraphs: [
          '如对本政策有任何疑问、建议或投诉，请通过应用内客服或发送邮件至 support@airwig.ca，我们将在 15 个工作日内予以回复。'
        ],
      },
    ],
    []
  );

  const handleGoBack = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Settings');
    }
  }, [navigation]);
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border.light,
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          隐私政策
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            AIRWIG 隐私政策
          </Text>
          
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>
            生效日期：2025 年 11 月 14 日
          </Text>
          {sections.map((section) => (
            <View key={section.title} style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary, borderBottomColor: colors.border.light }]}>
                {section.title}
              </Text>
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph} style={[styles.paragraph, { color: colors.text.secondary }]}>
                  {paragraph}
                </Text>
              ))}
              {section.list && (
                <View style={styles.listContainer}>
                  {section.list.map((item) => (
                    <View key={item} style={styles.listItem}>
                      <Text style={[styles.listDot, { color: colors.primary[500] }]}>•</Text>
                      <Text style={[styles.listText, { color: colors.text.secondary }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {/* Website Links */}
          <View style={[
            styles.linksContainer,
            { 
              borderColor: colors.border.light,
              backgroundColor: colors.background.secondary 
            }
          ]}>
            <Text style={[styles.linksTitle, { color: colors.text.primary }]}>
              在线查阅
            </Text>
            <Text style={[styles.linksDescription, { color: colors.text.secondary }]}>
              您也可以在官网查看本《隐私政策》与《服务条款》：
            </Text>
            
            <TouchableOpacity 
              style={[styles.linkButton, { borderColor: colors.border.light }]}
              onPress={() => {
                Linking.openURL('https://airwig.ca/privacy-policy').catch(err => {
                  Alert.alert('Error', 'Could not open link');
                });
              }}
            >
              <Ionicons name="lock-closed" size={20} color={colors.primary[500]} />
              <View style={styles.linkButtonContent}>
                <Text style={[styles.linkButtonTitle, { color: colors.text.primary }]}>
                  隐私政策
                </Text>
                <Text style={[styles.linkButtonUrl, { color: colors.text.primary }]}>
                  https://airwig.ca/privacy-policy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.linkButton, { borderColor: colors.border.light }]}
              onPress={() => {
                Linking.openURL('https://airwig.ca/terms-of-service').catch(err => {
                  Alert.alert('Error', 'Could not open link');
                });
              }}
            >
              <Ionicons name="document-text" size={20} color={colors.primary[500]} />
              <View style={styles.linkButtonContent}>
                <Text style={[styles.linkButtonTitle, { color: colors.text.primary }]}>
                  服务条款
                </Text>
                <Text style={[styles.linkButtonUrl, { color: colors.text.primary }]}>
                  https://airwig.ca/terms-of-service
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.linkButton, { borderColor: colors.border.light }]}
              onPress={() => {
                Linking.openURL('https://airwig.ca/support').catch(err => {
                  Alert.alert('Error', 'Could not open link');
                });
              }}
            >
              <Ionicons name="help-circle" size={20} color={colors.primary[500]} />
              <View style={styles.linkButtonContent}>
                <Text style={[styles.linkButtonTitle, { color: colors.text.primary }]}>
                  客服与支持
                </Text>
                <Text style={[styles.linkButtonUrl, { color: colors.text.primary }]}>
                  https://airwig.ca/support
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
  },
  sectionBlock: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 10,
  },
  listContainer: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  listDot: {
    fontSize: 16,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 40,
  },
  // Website links styles
  linksContainer: {
    marginTop: 12,
    padding: 18,
    borderWidth: 1,
    borderRadius: 14,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  linksDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  linkButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  linkButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkButtonUrl: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
