import React from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar
} from 'react-native';
import { BlurView } from 'expo-blur';
import { 
  Bell, 
  CalendarDays, 
  Clock, 
  Briefcase, 
  CircleDollarSign, 
  History, 
  QrCode,
  LogIn,
  LogOut,
  Utensils
} from 'lucide-react-native';
import { Tokens } from '../../src/core/theme/tokens';
import { useAuthStore } from '../../src/stores/auth.store';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { StatusBadge } from '../../src/components/ui/StatusBadge';

export default function HomeScreen() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Header */}
      <BlurView intensity={80} style={styles.header} tint="light">
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: `https://ui-avatars.com/api/?name=${user?.full_name || 'User'}&background=1a237e&color=fff` }} 
                style={styles.avatar} 
              />
              <View style={styles.onlineStatus} />
            </View>
            <View>
              <Text style={styles.userName}>{user?.full_name || 'Alex Sterling'}</Text>
              <Text style={styles.userRole}>Senior Developer</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <StatusBadge label="Clocked Out" />
            <TouchableOpacity style={styles.iconButton}>
              <Bell size={20} color={Tokens.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.clockTime}>05:15</Text>
          <Text style={styles.dateText}>Monday, Oct 23</Text>
          
          <View style={styles.scanContainer}>
            <View style={styles.pulseCircle} />
            <TouchableOpacity style={styles.scanButton}>
              <QrCode size={48} color="#fff" strokeWidth={1.5} />
              <Text style={styles.scanLabel}>Scan QR Code</Text>
            </TouchableOpacity>
          </View>

          <GlassCard style={styles.shiftCard}>
            <View style={styles.shiftInfo}>
              <View style={styles.shiftIconBox}>
                <Clock size={20} color={Tokens.colors.primaryContainer} />
              </View>
              <View>
                <Text style={styles.shiftLabel}>Today's Shift</Text>
                <Text style={styles.shiftTime}>08:00 - 17:00</Text>
              </View>
            </View>
            <Text style={styles.shiftStatus}>Finished</Text>
          </GlassCard>
        </View>

        {/* Quick Action Grid */}
        <View style={styles.grid}>
          <ActionItem icon={Briefcase} label="Leave (Cuti)" subtitle="Sisa: 12 Hari" color={Tokens.colors.secondaryContainer} iconColor={Tokens.colors.onSecondaryContainer} />
          <ActionItem icon={Clock} label="Overtime" subtitle="Request/history" color={`${Tokens.colors.primaryContainer}1A`} iconColor={Tokens.colors.primary} />
          <ActionItem icon={CircleDollarSign} label="Payroll" subtitle="Preview Payslip" color={`${Tokens.colors.tertiaryFixed}4D`} iconColor={Tokens.colors.onTertiaryContainer} />
          <ActionItem icon={History} label="History" subtitle="Attendance log" color={Tokens.colors.surfaceContainerHighest} iconColor={Tokens.colors.onSurfaceVariant} />
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
          </View>
          
          <ActivityItem 
            icon={LogIn} 
            title="Check-in: 08:02 AM" 
            subtitle="Oct 23, 2023 • Office HQ" 
            color={`${Tokens.colors.secondaryContainer}80`}
            iconColor={Tokens.colors.onSecondaryContainer}
          />
          <ActivityItem 
            icon={LogOut} 
            title="Check-out: 05:15 PM" 
            subtitle="Oct 23, 2023 • Office HQ" 
            color={`${Tokens.colors.errorContainer}80`}
            iconColor={Tokens.colors.onErrorContainer}
          />
          <ActivityItem 
            icon={Utensils} 
            title="Break: 12:05 PM" 
            subtitle="Oct 23, 2023 • 1 hour total" 
            color={`${Tokens.colors.primaryContainer}1A`}
            iconColor={Tokens.colors.primary}
            opacity={0.7}
          />
        </View>
        
        {/* Padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionItem({ icon: Icon, label, subtitle, color, iconColor }) {
  return (
    <TouchableOpacity style={styles.actionItem}>
      <GlassCard style={styles.actionCard}>
        <View style={[styles.actionIconBox, { backgroundColor: color }]}>
          <Icon size={20} color={iconColor} />
        </View>
        <View>
          <Text style={styles.actionLabel}>{label}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

function ActivityItem({ icon: Icon, title, subtitle, color, iconColor, opacity = 1 }) {
  return (
    <View style={[styles.activityItem, { opacity }]}>
      <View style={[styles.activityIconBox, { backgroundColor: color }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activitySubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Tokens.colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: 100,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderColor: Tokens.colors.white20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Tokens.spacing.page,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Tokens.colors.primaryContainer,
  },
  onlineStatus: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    backgroundColor: Tokens.colors.error,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Tokens.colors.surface,
  },
  userName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: Tokens.colors.primary,
  },
  userRole: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Tokens.colors.onSurfaceVariant,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120,
    paddingHorizontal: Tokens.spacing.page,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  clockTime: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 48,
    color: Tokens.colors.primary,
  },
  dateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Tokens.colors.onSurfaceVariant,
    marginBottom: 32,
  },
  scanContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pulseCircle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0, 6, 102, 0.05)',
  },
  scanButton: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: Tokens.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Tokens.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  scanLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.5,
  },
  shiftCard: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  shiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shiftIconBox: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(26, 35, 126, 0.1)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Tokens.colors.onSurfaceVariant,
  },
  shiftTime: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Tokens.colors.primary,
  },
  shiftStatus: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Tokens.colors.error,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionItem: {
    width: '48%',
  },
  actionCard: {
    gap: 12,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Tokens.colors.onSurface,
  },
  actionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Tokens.colors.onSurfaceVariant,
  },
  activitySection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: Tokens.colors.primary,
  },
  viewAll: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Tokens.colors.primary,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: Tokens.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  activityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Tokens.colors.onSurface,
  },
  activitySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Tokens.colors.onSurfaceVariant,
  },
});
