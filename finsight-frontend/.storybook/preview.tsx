import type { Preview } from "@storybook/react-vite";
import { themes } from "storybook/theming";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      theme: themes.dark,
    },
  },
  decorators: [
    (Story) => {
      return (
        <div className="bg-background overflow-auto rounded p-6">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
