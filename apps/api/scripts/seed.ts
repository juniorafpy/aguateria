import { hoyAsuncion } from "@aguateria/shared";
import { eq } from "drizzle-orm";
import { auth } from "../src/auth";
import { client, db } from "../src/db";
import { user } from "../src/db/schema/auth";
import {
  clientes,
  configuracion,
  medidores,
  periodos,
  tarifaTramos,
  tarifas,
} from "../src/db/schema/negocio";

async function crearUsuario(input: {
  name: string;
  username: string;
  password: string;
  role: "admin" | "operador";
}) {
  const email = `${input.username}@aguateria.local`;

  const [existente] = await db
    .select()
    .from(user)
    .where(eq(user.username, input.username))
    .limit(1);

  if (existente) {
    console.log(`  · usuario "${input.username}" ya existe`);
    return existente;
  }

  const resultado = await auth.api.signUpEmail({
    body: {
      email,
      password: input.password,
      name: input.name,
    },
  });

  const [actualizado] = await db
    .update(user)
    .set({
      username: input.username,
      displayUsername: input.username,
      role: input.role,
      emailVerified: true,
    })
    .where(eq(user.id, resultado.user.id))
    .returning();

  console.log(`  · usuario "${input.username}" creado (${input.role})`);
  return actualizado;
}

async function seedUsuarios() {
  console.log("Usuarios:");
  await crearUsuario({
    name: "Administrador",
    username: "admin",
    password: "admin1234",
    role: "admin",
  });
  await crearUsuario({
    name: "Operador de prueba",
    username: "operador",
    password: "operador1234",
    role: "operador",
  });
}

async function seedTarifa() {
  const [existente] = await db.select().from(tarifas).limit(1);
  if (existente) {
    console.log(`Tarifa: ya existe "${existente.nombre}"`);
    return;
  }

  const [tarifa] = await db
    .insert(tarifas)
    .values({
      nombre: "Tarifa 2026",
      vigenteDesde: "2026-01-01",
      cargoFijo: 30000,
      m3Incluidos: "10.00",
    })
    .returning();

  if (!tarifa) throw new Error("No se pudo crear la tarifa");

  await db.insert(tarifaTramos).values([
    { tarifaId: tarifa.id, desdeM3: "0.00", hastaM3: "20.00", precioM3: 3000 },
    { tarifaId: tarifa.id, desdeM3: "20.00", hastaM3: null, precioM3: 5000 },
  ]);

  console.log("Tarifa: creada Tarifa 2026 (30.000 Gs. + 10 m³ incluidos)");
}

const clientesDemo = [
  {
    codigo: "0001",
    nombre: "María Elena Benítez",
    ciRuc: "1.234.567",
    telefono: "0981 123 456",
    direccion: "Barrio San Blas, Mza. 4 Casa 12",
    fechaAlta: "2025-02-10",
    lecturaInicial: "125.40",
  },
  {
    codigo: "0002",
    nombre: "Ramón Antonio Giménez",
    ciRuc: "2.345.678",
    telefono: "0972 234 567",
    direccion: "Barrio Santa Rosa, Mza. 8 Casa 3",
    fechaAlta: "2025-02-10",
    lecturaInicial: "310.00",
  },
  {
    codigo: "0003",
    nombre: "Gladys Mercedes Ovelar",
    ciRuc: "3.456.789",
    telefono: "0985 345 678",
    direccion: "Barrio San Blas, Mza. 2 Casa 7",
    fechaAlta: "2025-03-01",
    lecturaInicial: "88.25",
  },
  {
    codigo: "0004",
    nombre: "Colegio Niño Jesús",
    ciRuc: "80012345-6",
    telefono: "021 345 678",
    direccion: "Av. Principal 450 casi Calle 3",
    fechaAlta: "2025-03-15",
    lecturaInicial: "540.00",
  },
  {
    codigo: "0005",
    nombre: "Juan Carlos Villalba",
    ciRuc: "4.567.890",
    telefono: "0991 456 789",
    direccion: "Barrio San Miguel, Mza. 12 Casa 1",
    fechaAlta: "2025-04-05",
    lecturaInicial: "42.10",
  },
  {
    codigo: "0006",
    nombre: "Norma Beatriz Cáceres",
    ciRuc: "5.678.901",
    telefono: "0983 567 890",
    direccion: "Barrio Santa Rosa, Mza. 3 Casa 15",
    fechaAlta: "2025-04-20",
    lecturaInicial: "198.70",
  },
  {
    codigo: "0007",
    nombre: "Despensa La Esperanza",
    ciRuc: "80098765-4",
    telefono: "021 456 789",
    direccion: "Calle 5 esquina Av. Principal",
    fechaAlta: "2025-05-02",
    lecturaInicial: "275.00",
  },
  {
    codigo: "0008",
    nombre: "Luis Alberto Ferreira",
    ciRuc: "6.789.012",
    telefono: "0971 678 901",
    direccion: "Barrio San Blas, Mza. 6 Casa 9",
    fechaAlta: "2025-06-10",
    lecturaInicial: "64.80",
  },
];

async function seedClientes() {
  console.log("Clientes:");
  let creados = 0;

  for (const demo of clientesDemo) {
    const [existente] = await db
      .select()
      .from(clientes)
      .where(eq(clientes.codigo, demo.codigo))
      .limit(1);

    if (existente) continue;

    const [cliente] = await db
      .insert(clientes)
      .values({
        codigo: demo.codigo,
        nombre: demo.nombre,
        ciRuc: demo.ciRuc,
        telefono: demo.telefono,
        direccion: demo.direccion,
        fechaAlta: demo.fechaAlta,
        estado: "activo",
      })
      .returning();

    if (!cliente) throw new Error(`No se pudo crear el cliente ${demo.codigo}`);

    await db.insert(medidores).values({
      clienteId: cliente.id,
      numeroSerie: `MED-${demo.codigo}`,
      lecturaInicial: demo.lecturaInicial,
      fechaInstalacion: demo.fechaAlta,
      activo: true,
    });

    creados += 1;
  }

  console.log(`  · ${creados} clientes nuevos (${clientesDemo.length} en total)`);
}

async function seedPeriodo() {
  const hoy = hoyAsuncion();
  const [anioTexto, mesTexto] = hoy.split("-");
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);

  const [existente] = await db.select().from(periodos).where(eq(periodos.anio, anio)).limit(1);

  const yaExiste = existente && existente.mes === mes;

  if (yaExiste) {
    console.log(`Período: ya existe ${mes}/${anio}`);
    return;
  }

  const vencimiento = new Date(anio, mes, 10);
  const fechaVencimiento = [
    vencimiento.getFullYear(),
    String(vencimiento.getMonth() + 1).padStart(2, "0"),
    String(vencimiento.getDate()).padStart(2, "0"),
  ].join("-");

  await db.insert(periodos).values({
    anio,
    mes,
    estado: "abierto",
    fechaVencimiento,
  });

  console.log(`Período: abierto ${mes}/${anio} (vence ${fechaVencimiento})`);
}

async function seedConfiguracion() {
  const valores = [
    ["aguateria_nombre", "Aguatería San Blas"],
    ["aguateria_direccion", "Barrio San Blas, Asunción"],
    ["aguateria_telefono", "021 000 000"],
    ["aguateria_ruc", ""],
    ["dia_vencimiento", "10"],
    ["meses_para_corte", "2"],
    ["recargo_mora", "0"],
  ] as const;

  await db
    .insert(configuracion)
    .values(valores.map(([clave, valor]) => ({ clave, valor })))
    .onConflictDoNothing();

  console.log("Configuración: valores por defecto cargados");
}

async function main() {
  console.log("\n=== Seed de Aguatería ===\n");
  await seedUsuarios();
  await seedTarifa();
  await seedClientes();
  await seedPeriodo();
  await seedConfiguracion();
  console.log("\nListo. Usuario admin: admin / admin1234\n");
}

main()
  .catch((error) => {
    console.error("\nError en el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
