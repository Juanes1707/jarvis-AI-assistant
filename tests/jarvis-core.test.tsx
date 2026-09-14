import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { JarvisCore, type CoreState } from "../src/components/jarvis/core";

const states: CoreState[] = ["idle", "listening", "thinking", "speaking", "offline"];

describe("núcleo de JARVIS", () => {
  it.each(states)("se monta en el estado real «%s» sin romper el árbol nativo", async state => {
    await render(<JarvisCore state={state} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it("no se anuncia al lector de pantalla porque el estado viaja como texto", async () => {
    await render(<JarvisCore state="listening" />);
    expect(screen.queryByLabelText(/.*/)).toBeNull();
  });
});
