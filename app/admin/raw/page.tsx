import RawDataView from "@/components/admin/RawDataView";
import { RAW_KEYS, RAW_PAGE_SIZE, RAW_TABLES, readRawTable, type RawTable } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Raw data" };

interface RawPageProps {
  searchParams?: { table?: string | string[]; page?: string | string[] };
}

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function AdminRawPage({ searchParams }: RawPageProps) {
  const wanted = first(searchParams?.table);
  const table: RawTable = RAW_TABLES.find((name) => name === wanted) ?? RAW_TABLES[0];
  const page = Math.max(1, Math.floor(Number(first(searchParams?.page))) || 1);

  const { data } = await withAdmin("/admin/raw", () => readRawTable(table, page));
  return <RawDataView tables={RAW_TABLES} table={table} keyColumn={RAW_KEYS[table]} page={page} pageSize={RAW_PAGE_SIZE} {...data} />;
}
