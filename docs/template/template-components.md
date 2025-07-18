# Template Components

This document lists all components provided by the template and their intended usage.

## Authentication Components

### `src/components/auth/`

- **AuthLoadingBoundary.tsx** - Error boundary for authentication loading states
- **ClientLoginButton.tsx** - OAuth login button component
- **LogoutButton.tsx** - Logout functionality component
- **ResetPasswordForm.tsx** - Password reset form
- **SignInForm.tsx** - Sign-in form with OAuth options
- **SignUpForm.tsx** - Sign-up form with validation

## Chat Components

### `src/components/chat/`

- **ChatErrorBoundary.tsx** - Error boundary for chat functionality
- **ChatMenu.tsx** - Chat navigation menu
- **ChatPane.tsx** - Main chat interface
- **CommentDisplay.tsx** - Display individual comments
- **CommentEditor.tsx** - Rich text editor for comments
- **RichTextEditor.tsx** - TipTap-based rich text editor
- **ThreadDetail.tsx** - Individual thread view
- **ThreadList.tsx** - List of chat threads
- **ThreadListSkeleton.tsx** - Loading skeleton for thread list

## Common Components

### `src/components/common/`

- **AuthHeader.tsx** - Authentication header component
- **FormDialog.tsx** - Reusable form dialog component
- **FormInput.tsx** - Standardized form input component

## Dashboard Components

### `src/components/dashboard/`

- **InternalToolsDashboard.tsx** - Main dashboard component
- **DailyViewerChart.tsx** - Chart component for dashboard

## Notification Components

### `src/components/notifications/`

- **NotificationCenter.tsx** - Notification management interface

## Team Components

### `src/components/teams/`

- **TeamSelector.tsx** - Team selection dropdown

## Layout Components

### `src/components/`

- **DarkModeToggle.tsx** - Theme toggle component
- **DashboardNav.tsx** - Dashboard navigation
- **ErrorBoundary.tsx** - Global error boundary
- **Footer.tsx** - Application footer
- **FooterCopyright.tsx** - Footer copyright section
- **FooterLinks.tsx** - Footer navigation links
- **FullscreenToggle.tsx** - Fullscreen mode toggle
- **Layout.tsx** - Main application layout
- **UserMenu.tsx** - User profile menu

## Provider Components

### `src/components/providers/`

- **Providers.tsx** - Application provider wrapper
- **QueryProvider.tsx** - React Query provider

## Layout Components

### `src/components/layouts/`

- **PageLayout.tsx** - Standard page layout wrapper

## Component Usage Guidelines

### Template Components (Don't Modify)

All components listed above are part of the template and should not be modified directly. Instead:

1. **Extend through props**: Use props to customize behavior
2. **Create wrapper components**: Wrap template components in custom components
3. **Use extension points**: Utilize the extension system for customization
4. **Override through CSS**: Use theme customization for styling changes

### Custom Components (Safe to Create)

Create custom components in these directories:

- `src/components/custom/` - General custom components
- `src/components/business/` - Business-specific components
- `src/features/` - Feature-specific components

### Component Patterns

#### Template Component Pattern

```typescript
// Template components follow this pattern
interface TemplateComponentProps {
  // Standard props
  className?: string;
  children?: React.ReactNode;
  // Component-specific props
  [key: string]: any;
}

export const TemplateComponent: React.FC<TemplateComponentProps> = ({
  className,
  children,
  ...props
}) => {
  // Template implementation
};
```

#### Custom Component Pattern

```typescript
// Custom components should follow template patterns
interface CustomComponentProps {
  // Extend template patterns
  className?: string;
  children?: React.ReactNode;
  // Custom props
  customProp?: string;
}

export const CustomComponent: React.FC<CustomComponentProps> = ({
  className,
  children,
  customProp,
  ...props
}) => {
  // Custom implementation
};
```

### Component Integration

#### Using Template Components

```typescript
// ✅ Good: Use template components as-is
import { ThreadList } from '@/components/chat';

export const MyPage = () => {
  return (
    <div>
      <ThreadList teamId="team-123" />
    </div>
  );
};
```

#### Extending Template Components

```typescript
// ✅ Good: Create wrapper components
import { ThreadList } from '@/components/chat';

interface CustomThreadListProps {
  teamId: string;
  customFilter?: string;
}

export const CustomThreadList: React.FC<CustomThreadListProps> = ({
  teamId,
  customFilter,
  ...props
}) => {
  // Add custom logic
  const filteredTeamId = customFilter ? `${teamId}-${customFilter}` : teamId;

  return <ThreadList teamId={filteredTeamId} {...props} />;
};
```

#### Creating Custom Components

```typescript
// ✅ Good: Create completely custom components
interface MyCustomComponentProps {
  data: any[];
  onAction: (item: any) => void;
}

export const MyCustomComponent: React.FC<MyCustomComponentProps> = ({
  data,
  onAction,
}) => {
  // Custom implementation
  return (
    <div>
      {data.map(item => (
        <button key={item.id} onClick={() => onAction(item)}>
          {item.name}
        </button>
      ))}
    </div>
  );
};
```

### Component Testing

#### Template Component Testing

Template components include their own tests. Don't modify these tests.

#### Custom Component Testing

Create tests for custom components:

```typescript
// src/__tests__/custom/MyCustomComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyCustomComponent } from '@/components/custom/MyCustomComponent';

describe('MyCustomComponent', () => {
  it('should render correctly', () => {
    const mockData = [{ id: '1', name: 'Test' }];
    const mockOnAction = jest.fn();

    render(<MyCustomComponent data={mockData} onAction={mockOnAction} />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Component Documentation

#### Template Components

Template components are documented in this file and should not be modified.

#### Custom Components

Document custom components in `docs/custom/custom-components.md`:

```markdown
# Custom Components

## MyCustomComponent

- **Purpose**: Description of what the component does
- **Props**: List of props and their types
- **Usage**: Example usage
- **Dependencies**: Any dependencies on template components
```

### Component Best Practices

1. **Don't modify template components** - Use extension patterns instead
2. **Follow template patterns** - Maintain consistency with template design
3. **Use TypeScript** - All components should be fully typed
4. **Include error boundaries** - Handle errors gracefully
5. **Add loading states** - Provide feedback during async operations
6. **Test thoroughly** - Include unit and integration tests
7. **Document usage** - Provide clear documentation for custom components
8. **Maintain accessibility** - Follow WCAG guidelines
9. **Optimize performance** - Use React.memo and useMemo where appropriate
10. **Follow naming conventions** - Use consistent naming patterns
