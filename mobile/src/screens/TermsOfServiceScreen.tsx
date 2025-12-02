import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface TermsOfServiceScreenProps {
  navigation?: any;
  showAcceptButton?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function TermsOfServiceScreen({ 
  navigation: navigationProp, 
  showAcceptButton = false, 
  onAccept, 
  onDecline 
}: TermsOfServiceScreenProps) {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const navigationHook = useNavigation<any>();
  const navigation = navigationProp ?? navigationHook;

  const sections = useMemo(
    () => [
      {
        title: '一、总则',
        paragraphs: [
          '本《服务条款》（以下简称“本条款”）是您与 AIRWIG 平台之间关于使用本平台产品与服务的法律协议。通过访问或使用本平台，您即表示已阅读、理解并同意受本条款约束。',
          '本条款适用并受《中华人民共和国民法典》《中华人民共和国网络安全法》《个人信息保护法》等现行法律法规约束。若本条款与适用法律存在冲突，以法律法规为准。',
          '如您不同意本条款的任何内容，应立即停止使用本平台；继续使用视为您接受经不时修订后的全部条款。'
        ],
      },
      {
        title: '二、账号注册与安全',
        paragraphs: [
          '您需具备完全民事行为能力，并使用真实、准确、完整的信息完成注册或登录。若信息发生变化，应及时更新，确保可与您保持联系。',
          '若您为未成年人，应在监护人监护、指导下阅读并遵守本条款。'
        ],
        list: [
          '妥善保管登录凭据，不得向他人转让、出借或共享账号；因您的原因造成的风险和损失由您自行承担。',
          '发现账号遭他人使用或存在安全漏洞时，请立即通知我们并配合完成处理。',
          '在法律允许的范围内，我们有权出于安全、合规或运营需要对账号进行暂停、限制或注销。'
        ],
      },
      {
        title: '三、服务使用范围',
        paragraphs: [
          '本平台向您提供社交互动、内容发布、信息浏览、消息沟通等服务功能，并可能根据业务发展不时调整或新增模块。',
          '我们将持续优化产品体验，但不对服务的连续性、实时性或无错误运行作出保证。必要时，我们可对全部或部分服务进行维护、升级、中止或终止，并将依法告知。'
        ],
      },
      {
        title: '四、用户内容与知识产权',
        paragraphs: [
          '您在本平台发布的文字、图片、音视频、音频、代码及其他信息（统称“用户内容”）由您保证具备合法权利。用户内容的知识产权仍归您或原权利人所有。',
          '为实现信息存储、内容审核、产品展示及推广，您授予 AIRWIG 在全球范围内的、免费的、不可撤销的、非独占且可再许可的权利，以使用、复制、改编、翻译、发布、展示及分发前述用户内容。',
          '我们尊重知识产权并设立投诉与维权渠道，如您发现他人侵权，可通过支持渠道向我们反馈。'
        ],
      },
      {
        title: '五、个人信息与隐私保护',
        paragraphs: [
          '我们重视对您个人信息与隐私的保护，并将严格遵循《隐私政策》及相关法律要求，明示信息收集用途，采取合理的安全措施保障数据安全。',
          '除法律法规另有规定或征得您本人授权同意外，我们不会向第三方提供您的个人信息。您有权依法查询、更正、删除个人信息或撤回授权。'
        ],
      },
      {
        title: '六、禁止行为',
        paragraphs: ['您承诺在使用本平台时遵守法律法规、公序良俗及本条款，禁止实施下列行为：'],
        list: [
          '发布、传播或储存违反国家法律法规、存在政治敏感、淫秽色情、恐怖暴力、赌博诈骗等内容；',
          '侵害任何第三方知识产权、商业秘密、名誉权、肖像权、隐私权或其他合法权益；',
          '冒用他人身份、组织或机构名义，散布虚假信息，误导或欺诈他人；',
          '利用漏洞、外挂、机器人或其他技术手段扰乱平台秩序、破坏系统安全；',
          '进行数据抓取、反向工程、恶意注册账号或进行任何影响平台正常运营的行为；',
          '未经许可进行商业广告、营销推广或垃圾信息分发；',
          '其他被法律法规禁止或经我们合理判断不适当的行为。'
        ],
      },
      {
        title: '七、平台权利与免责声明',
        paragraphs: [
          '针对您可能违反法律法规或本条款的行为，我们有权根据情节采取内容删除、限制功能、终止服务、移交监管机构等措施。',
          '在法律允许范围内，因不可抗力、网络故障、第三方服务瑕疵或您自身原因导致的损失，我们不承担间接、附带、特殊或衍生损害责任；但法律另有规定的除外。'
        ],
      },
      {
        title: '八、未成年人保护',
        paragraphs: [
          '我们高度重视未成年人的网络安全与身心健康。若您为未成年人，应在监护人同意与指导下使用本平台，并严格遵守《未成年人网络保护条例》等规定。',
          '我们将根据法律要求对可能影响未成年人的内容和功能进行限制，并提供举报和反馈渠道。'
        ],
      },
      {
        title: '九、服务变更与终止',
        paragraphs: [
          '我们可根据业务调整、运营策略或法律政策变化，对服务内容、费用和条款进行修改，并通过站内通知、弹窗或其他合理方式向您提示。',
          '如您不同意变更内容，可停止使用服务；您继续使用则视为接受调整后的条款。',
          '您可随时通过设置页面申请注销账号，账号注销后相关数据将按照法律法规和《隐私政策》处理。'
        ],
      },
      {
        title: '十、争议解决与适用法律',
        paragraphs: [
          '本条款的订立、生效、履行、解释及争议解决均适用中华人民共和国法律。',
          '因本条款或使用本服务所引起的争议，双方应先行友好协商；协商不成的，提交 AIRWIG 运营方所在地有管辖权的人民法院诉讼解决。'
        ],
      },
      {
        title: '十一、联系我们',
        paragraphs: [
          '如您对本条款有疑问、建议或需要投诉举报，可通过应用内客服中心或发送邮件至 support@airwig.ca 与我们联系，我们将及时核实并给予反馈。'
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

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    } else {
      handleGoBack();
    }
  };

  const handleDecline = () => {
    if (onDecline) {
      onDecline();
    } else {
      handleGoBack();
    }
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isScrolledToBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
    setHasScrolledToBottom(isScrolledToBottom);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          服务条款
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            AIRWIG 服务条款
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
              您也可以通过网页版查看本《服务条款》与《隐私政策》：
            </Text>
            
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

      {/* Accept/Decline Buttons (only shown during sign-up flow) */}
      {showAcceptButton && (
        <View style={[styles.buttonContainer, { borderTopColor: colors.border.light }]}>
          <TouchableOpacity
            style={[styles.declineButton, { borderColor: colors.border.light }]}
            onPress={handleDecline}
          >
            <Text style={[styles.declineButtonText, { color: colors.text.secondary }]}>
              拒绝
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.acceptButton,
              { backgroundColor: colors.primary[500] },
              !hasScrolledToBottom && styles.acceptButtonDisabled
            ]}
            onPress={handleAccept}
            disabled={!hasScrolledToBottom}
          >
            <Text style={styles.acceptButtonText}>
              同意条款
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
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
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
