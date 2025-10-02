# LaunchDarkly Context Demo App

A React application demonstrating LaunchDarkly's multi-context feature flagging capabilities with real-time context updates and visual feedback.

<div>
    <a href="https://www.loom.com/share/12081fe5ab93474bad345bbb120913c7">
      <p>LD Context Demo - 2 October 2025 - Watch Video</p>
    </a>
    <a href="https://www.loom.com/share/12081fe5ab93474bad345bbb120913c7">
      <img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/12081fe5ab93474bad345bbb120913c7-ca0143314b246758-full-play.gif">
    </a>
  </div>



## 🚀 Features

### Multi-Context Support
- **User Context**: Email-based authentication with customer status classification
- **Anonymous User Context**: Auto-generated for non-authenticated users
- **Office Context**: Location-based context for LaunchDarkly employees

### User Classification
- **Employees**: Users with `@launchdarkly.com` email addresses are classified as "Employee" (not "Customer")
- **Customers**: All other email addresses are classified as "Bronze Customer"

### Interactive Profile Management
- **Display Name Editing**: Click the pencil icon next to your name to update it, this will call the identify method to update the context.  The context that is updated will be highlighted for a short period to call out the update.
- **Location Management**: LaunchDarkly employees can toggle between "Remote" and "In Office".  If you edit the location the identify method is called and the context is updated. The context that is updated will be highlighted for a short period to call out the update.
- **Real-time Context Updates**: Changes are immediately reflected in LaunchDarkly via `identify()` calls

### Feature Flags
- **enable-lunch-order**: Shows an orange "Order Lunch" button when employees select the in office button for their location
- **release-shiny-banner**: Displays a promotional banner for gold customers
- **show-newsletter-signup**: Shows newsletter signup prompt
- **show-limited-time-offer**: Green banner offering 50% off Gold upgrade (percentage rollout to bronze/silver customers) to only customers

## 🔧 Setup

### Prerequisites
- Node.js 16+ 
- LaunchDarkly account with a client-side ID

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the `.env.example` and update the name to`.env` in the project root:
   ```
   REACT_APP_LD_CLIENT_ID=your-launchdarkly-client-side-id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🔐 Authentication

**Note**: This is a demo application with no real authentication validation.

- **Username/Password**: You can use any email and password combination
- **No Validation**: The app accepts any credentials for demonstration purposes
- **Persistent Login**: Uses cookies to maintain login state across sessions

### Example Logins
- `employee@launchdarkly.com` / `any-password` → Employee status
- `customer@example.com` / `any-password` → Bronze Customer status

## 🎯 LaunchDarkly Integration

### Context Structure
The app creates multi-contexts with the following structure:

```json
{
  "kind": "multi",
  "user": {
    "key": "user@example.com",
    "name": "Display Name",
    "email": "user@example.com",
    "customerStatus": "bronze"
  },
  "anonymousUser": {
    "key": "auto-generated-uuid",
    "anonymous": true
  }
}
```

### Feature Flags
Create these boolean flags in your LaunchDarkly project:
- `enable-lunch-order`
- `release-shiny-banner` 
- `show-newsletter-signup`
- `show-limited-time-offer`

#### Flag Targeting Examples:
- **show-limited-time-offer**: Set up percentage rollout to 50% of users where `customerStatus` is `bronze` OR `silver`
- **release-shiny-banner**: Target only `customerStatus` equals `gold`
- **show-newsletter-signup**: Target all customer types or specific segments

### Real-time Updates
- Profile changes trigger `ldClient.identify()` calls
- Context updates are immediately visible in LaunchDarkly dashboard
- Flag evaluations update in real-time without page refresh

## 🎨 UI Features

- **Resizable Panels**: Drag the divider to adjust panel sizes


## 📝 Notes

This is a demo application and is not intended for production use without proper security implementations.