import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Button, Progress } from "../src/components/ui/primitives";

describe("controles nativos", () => {
  it("expone el botón accesible y bloquea pulsaciones durante una escritura", async () => {
    const action = jest.fn();
    const view = await render(<Button label="Guardar progreso" onPress={action} />);
    await fireEvent.press(screen.getByRole("button", { name: "Guardar progreso" }));
    expect(action).toHaveBeenCalledTimes(1);
    await view.rerender(<Button label="Guardar progreso" loading onPress={action} />);
    await fireEvent.press(screen.getByRole("button", { name: "Guardar progreso" }));
    expect(action).toHaveBeenCalledTimes(1);
  });
  it("expone progreso numérico al lector de pantalla", async () => {
    await render(<Progress value={65} label="Taller de Lagrange" />);
    expect(screen.getByRole("progressbar", { name: "Taller de Lagrange" }).props.accessibilityValue).toEqual({ min: 0, max: 100, now: 65 });
  });
});
