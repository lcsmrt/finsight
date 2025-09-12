import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "./select";

const meta: Meta = {
  title: "Form/Select",
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof meta>;

const fruits = ["Apple", "Banana", "Orange", "Mango"];

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        {fruits.map((fruit) => (
          <SelectItem key={fruit} value={fruit}>
            {fruit}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a drink" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Juices</SelectLabel>
          <SelectItem value="apple">Apple Juice</SelectItem>
          <SelectItem value="orange">Orange Juice</SelectItem>
          <SelectItem value="grape">Grape Juice</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Teas</SelectLabel>
          <SelectItem value="jasmine">Jasmine Tea</SelectItem>
          <SelectItem value="hibiscus">Hibiscus Tea</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const DisabledItem: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select an Item" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="enabled">Enabled</SelectItem>
        <SelectItem value="disabled" disabled>
          Disabled
        </SelectItem>
      </SelectContent>
    </Select>
  ),
};
