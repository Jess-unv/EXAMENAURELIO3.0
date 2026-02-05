# AI Coding Agent Instructions for QuickPay

## Project Overview
QuickPay is a mobile application designed to streamline payment processes. The project is structured using React Native and follows a modular architecture. Key components include authentication, product management, order handling, and navigation.

### Key Directories
- **`src/api`**: Contains API interaction logic, such as `products.js` for product-related API calls.
- **`src/components`**: Reusable UI components like `Button.js` and `ProductCard.js`.
- **`src/context`**: Context providers for managing global state, e.g., `AuthContext.js` for authentication.
- **`src/screens`**: Screen components representing different app views, such as `CartScreen.js` and `ProviderDashboard.js`.
- **`src/utils`**: Utility functions, including `supabase.js` for database interactions and `validations.js` for form validation.

## Development Workflows

### Setting Up
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```

### Testing
- Currently, no explicit test scripts are defined. Add tests in a `__tests__` directory following Jest conventions.

### Debugging
- Use React Native Debugger for inspecting app state and network requests.

## Project-Specific Conventions

### State Management
- Context API is used for global state management. Key contexts include:
  - `AuthContext`: Handles user authentication state.
  - `ProductContext`: Manages product-related data.

### Navigation
- Navigation is managed using React Navigation. The `AppNavigator.js` file defines the primary navigation structure.

### API Integration
- API calls are centralized in the `src/api` directory. For example, `products.js` contains functions for fetching and managing product data.

### Styling
- The `src/constants/theme.js` file defines shared styles and themes.

## External Dependencies
- **Supabase**: Used for backend services. Configuration is in `src/utils/supabase.js`.
- **React Navigation**: For handling navigation between screens.

## Examples

### Adding a New Screen
1. Create a new file in `src/screens`, e.g., `NewScreen.js`.
2. Define the component and export it.
3. Add the screen to the navigation structure in `AppNavigator.js`.

### Adding a New API Function
1. Add the function to the relevant file in `src/api`.
2. Use the function in the appropriate context or screen.

---

For further clarification or updates, feel free to refine this document.