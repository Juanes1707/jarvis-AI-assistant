import { fireEvent, render, screen } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { router } from "expo-router";
import { CommandBar } from "../src/components/jarvis/command-bar";

jest.mock("expo-router", () => ({ router: { navigate: jest.fn() } }));

describe("entrada libre de JARVIS en Inicio", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("no ofrece preguntas prefabricadas y envía únicamente el texto del usuario", async () => {
    await render(<CommandBar />);

    expect(screen.queryByText("¿Qué estudio hoy?")).toBeNull();
    expect(screen.queryByText("Organiza mi día")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("Preguntar a JARVIS"), "Analiza mis prioridades reales");
    await fireEvent.press(screen.getByRole("button", { name: "Consultar JARVIS" }));

    expect(router.navigate).toHaveBeenCalledWith({
      pathname: "/jarvis",
      params: { question: "Analiza mis prioridades reales", request: expect.any(String) },
    });
  });
});
