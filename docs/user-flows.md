# User Flows

## Authentication Flows

### Account Creation

1. User arrives at signup page
2. User can choose between:
   - OAuth options (Google, Azure AD)
   - Email/Password registration
3. For OAuth:
   - User clicks OAuth provider button
   - Completes provider's authentication flow
   - Returns to app with provider's profile info
   - System creates account and profile
   - User is redirected to dashboard

4. For Email/Password:
   - User fills out registration form (name, email, password)
   - System sends verification email
   - User clicks verification link
   - Email is verified
   - User is redirected to dashboard

### Sign In

1. User arrives at signin page
2. User can choose between:
   - OAuth options (same providers as signup)
   - Email/Password signin
3. For OAuth:
   - Same flow as signup
   - System recognizes existing account
   - User is redirected to dashboard

4. For Email/Password:
   - User enters email and password
   - If valid, redirected to dashboard
   - If invalid, shown error message
   - If unverified, shown verification reminder

### Password Reset

1. User clicks "Forgot Password" on signin page
2. Enters email address
3. System sends reset password email
4. User clicks reset link
5. User enters new password
6. Password is updated
7. User is redirected to signin

## Team Management Flows

### Creating a Team

1. User clicks "Create Team" in dashboard
2. Enters team name
3. System:
   - Creates team record
   - Makes user team admin
   - Creates default team settings
4. User is redirected to team management page

### Inviting Team Members

1. Admin/Member clicks "Invite Member" in team page
2. Enters email and selects role (admin/member)
3. System:
   - Creates invite record with expiry (48 hours)
   - Sends notification email
   - Shows success message
4. Invited email receives invitation with:
   - Team details
   - Accept/Decline buttons
   - Expiry information

### Accepting Team Invites

1. User receives invite email
2. Clicks accept button
3. System checks:
   - If invite is valid and not expired
   - If user is logged in
4. If not logged in:
   - User is prompted to sign in or create account
   - After auth, system remembers pending invite
5. If logged in:
   - User is added to team with specified role
   - Invite is marked as accepted
   - User is redirected to team page
6. Both inviter and invitee receive notifications

### Managing Team Members

1. Admin can:
   - View all team members and invites
   - Change member roles
   - Remove members
   - Cancel pending invites
2. Members can:
   - View all team members
   - Invite new members (if permitted)
3. All actions trigger notifications

## Notification System

### Notification Types

1. Authentication:
   - Email verification
   - Password reset
   - New device signin
   - Account changes

2. Team-related:
   - Invite received
   - Invite accepted/declined
   - Role changes
   - Removal from team
   - Team settings changes

3. System:
   - Maintenance notifications
   - Feature updates
   - Security alerts

### Notification Delivery

1. Email notifications:
   - Authentication events
   - Team invites
   - Important system updates

2. In-app notifications:
   - Real-time using WebSocket
   - Stored in notification center
   - Mark as read/unread
   - Clear/delete options

3. Notification Preferences:
   - Users can customize:
     - Which notifications to receive
     - Delivery methods (email, in-app, both)
     - Frequency (instant, digest)

## User Settings

### Profile Management

1. Users can:
   - Update name and contact info
   - Change password
   - Link/unlink OAuth providers
   - Set notification preferences
   - View active sessions
   - Delete account

### Team Preferences

1. Per-team settings:
   - Notification preferences
   - Display preferences
   - Role-specific settings

## Security Considerations

### Authentication

- Rate limiting on auth attempts
- Device tracking
- Session management
- 2FA support (future)

### Team Security

- Role-based access control
- Audit logging
- Invite expiration
- Member removal cleanup

### Data Protection

- End-to-end encryption for sensitive data
- Regular security audits
- GDPR compliance
- Data export/deletion options
