import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mail, Search } from "lucide-react";
import { fn } from "storybook/test";
import { Input } from "./input";

const meta = {
  title: "Form/Input",
  component: Input,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    error: { control: "text" },
    description: { control: "text" },
    disabled: { control: "boolean" },
    iconLeft: {
      control: "boolean",
      mapping: {
        true: <Search className="h-4 w-4" />,
        false: undefined,
      },
    },
    iconRight: {
      control: "boolean",
      mapping: {
        true: <Mail className="h-4 w-4" />,
        false: undefined,
      },
    },
  },
  args: {
    onChange: fn(),
    disabled: false,
    iconLeft: false,
    iconRight: false,
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Example",
    placeholder: "Type something",
  },
};

export const WithError: Story = {
  args: {
    label: "Example",
    placeholder: "Type something",
    error: "Error message",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Example",
    placeholder: "Type something",
    description: "Descriptive text",
  },
};

export const WithIcons: Story = {
  args: {
    label: "Search",
    placeholder: "Search something",
    iconLeft: true,
    iconRight: true,
  },
  render: (args) => (
    <Input
      {...args}
      iconLeft={args.iconLeft ? <Search className="h-4 w-4" /> : undefined}
      iconRight={args.iconRight ? <Mail className="h-4 w-4" /> : undefined}
    />
  ),
};

export const Disabled: Story = {
  args: {
    label: "Example",
    placeholder: "Not editable",
    disabled: true,
  },
};
