import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

const meta: Meta<typeof Avatar> = {
  title: "Avatar",
  component: Avatar,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  render: () => (
    <Avatar className="size-12">
      <AvatarImage
        src="https://c.files.bbci.co.uk/7471/production/_128490892_beaver_getty.jpg"
        alt="Beaver avatar"
        className="object-cover"
      />
      <AvatarFallback>U</AvatarFallback>
    </Avatar>
  ),
};

export const WithFallback: Story = {
  render: () => (
    <Avatar className="size-12">
      <AvatarImage src="invalid-url.png" alt="broken" />
      <AvatarFallback>BV</AvatarFallback>
    </Avatar>
  ),
};
