import { describe, expect, it } from "vitest";
import { Frecuencia, ParadaIntermedia } from "./Frecuencia";

const crearFrecuencia = (): Frecuencia =>
  new Frecuencia(1, "Quito", "Cuenca", "08:30", "FR-001");

describe("Frecuencia", () => {
  it("es válida con datos correctos y opera todos los días por defecto", () => {
    const frecuencia = crearFrecuencia();

    expect(frecuencia.esValida()).toBe(true);
    expect(frecuencia.opera("Domingo")).toBe(true);
  });

  it("rechaza origen igual al destino, hora mal formada y sin días", () => {
    expect(new Frecuencia(1, "Quito", "quito", "08:30", "FR").esValida()).toBe(false);
    expect(new Frecuencia(1, "Quito", "Cuenca", "25:00", "FR").esValida()).toBe(false);
    expect(new Frecuencia(1, "Quito", "Cuenca", "08:30", "FR", true, []).esValida()).toBe(false);
  });

  it("no opera cuando está desactivada o el día no está incluido", () => {
    const frecuencia = new Frecuencia(1, "Quito", "Cuenca", "08:30", "FR", true, ["Lunes"]);

    expect(frecuencia.opera("Martes")).toBe(false);
    frecuencia.desactivar();
    expect(frecuencia.opera("Lunes")).toBe(false);
    frecuencia.activar();
    expect(frecuencia.opera("Lunes")).toBe(true);
  });
});

describe("Paradas intermedias", () => {
  it("acepta paradas con orden y tiempos crecientes", () => {
    const frecuencia = crearFrecuencia();
    frecuencia.agregarParada(new ParadaIntermedia("Riobamba", 2, 240));
    frecuencia.agregarParada(new ParadaIntermedia("Latacunga", 1, 120));

    expect(frecuencia.esValida()).toBe(true);
    expect(frecuencia.obtenerParadasOrdenadas().map((p) => p.ciudad)).toEqual([
      "Latacunga",
      "Riobamba",
    ]);
  });

  it("rechaza orden repetido, tiempos que retroceden y paradas en origen o destino", () => {
    const repetido = crearFrecuencia();
    repetido.agregarParada(new ParadaIntermedia("Latacunga", 1, 120));
    repetido.agregarParada(new ParadaIntermedia("Riobamba", 1, 240));
    expect(repetido.esValida()).toBe(false);

    const retrocede = crearFrecuencia();
    retrocede.agregarParada(new ParadaIntermedia("Latacunga", 1, 240));
    retrocede.agregarParada(new ParadaIntermedia("Riobamba", 2, 120));
    expect(retrocede.esValida()).toBe(false);

    const enExtremo = crearFrecuencia();
    enExtremo.agregarParada(new ParadaIntermedia("cuenca", 1, 120));
    expect(enExtremo.esValida()).toBe(false);
  });

  it("valida los campos de una parada", () => {
    expect(new ParadaIntermedia("", 1, 10).esValida()).toBe(false);
    expect(new ParadaIntermedia("Ambato", 0, 10).esValida()).toBe(false);
    expect(new ParadaIntermedia("Ambato", 1, -5).esValida()).toBe(false);
    expect(new ParadaIntermedia("Ambato", 1, 10, true, -1).esValida()).toBe(false);
  });
});

describe("cubreTramo", () => {
  const frecuencia = crearFrecuencia();
  frecuencia.agregarParada(new ParadaIntermedia("Latacunga", 1, 120));
  frecuencia.agregarParada(new ParadaIntermedia("Ambato", 2, 180, false));
  frecuencia.agregarParada(new ParadaIntermedia("Riobamba", 3, 240));

  it("cubre el recorrido completo sin importar mayúsculas", () => {
    expect(frecuencia.cubreTramo("quito", "CUENCA")).toBe(true);
  });

  it("cubre sub-tramos entre paradas que permiten venta", () => {
    expect(frecuencia.cubreTramo("Latacunga", "Riobamba")).toBe(true);
    expect(frecuencia.cubreTramo("Quito", "Riobamba")).toBe(true);
  });

  it("no cubre paradas sin venta, sentido inverso ni ciudades ajenas", () => {
    expect(frecuencia.cubreTramo("Ambato", "Cuenca")).toBe(false);
    expect(frecuencia.cubreTramo("Cuenca", "Quito")).toBe(false);
    expect(frecuencia.cubreTramo("Quito", "Guayaquil")).toBe(false);
    expect(frecuencia.cubreTramo("Quito", "Quito")).toBe(false);
  });
});
