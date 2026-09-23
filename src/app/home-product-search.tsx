"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import type { ProductImportResult } from "@/lib/suppliers/types";
import { navigateWithProductImportHandoff } from "@/lib/product-import-flow";

import styles from "./page.module.css";

const CORRECTABLE_ERRORS = new Set(["INVALID_URL", "UNSUPPORTED_SUPPLIER"]);

const FAILURE_MESSAGES: Record<string, string> = {
  INVALID_URL: "Проверьте ссылку: нужен полный адрес страницы товара.",
  UNSUPPORTED_SUPPLIER: "Этот магазин пока не поддерживается. Используйте ссылку BIKE24 или Bike-Discount.",
};

export function HomeProductSearch() {
  const router = useRouter();
  const [productUrl, setProductUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function importProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const normalizedUrl = productUrl.trim();
    setIsLoading(true);
    setErrorMessage("");

    let result: ProductImportResult;
    try {
      const response = await fetch("/api/product-import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      result = await response.json() as ProductImportResult;
    } catch {
      result = {
        ok: false,
        error: {
          code: "FETCH_FAILED",
          message: "The product import request could not be completed.",
        },
      };
    }

    if (!result.ok && CORRECTABLE_ERRORS.has(result.error.code)) {
      setErrorMessage(FAILURE_MESSAGES[result.error.code] ?? "Проверьте ссылку и попробуйте снова.");
      setIsLoading(false);
      return;
    }

    try {
      navigateWithProductImportHandoff(normalizedUrl, result, (destination) => {
        router.push(destination);
      });
    } catch {
      setErrorMessage("Не удалось открыть следующий шаг. Обновите страницу и попробуйте снова.");
      setIsLoading(false);
    }
  }

  return (
    <>
      <form className={styles.linkForm} onSubmit={importProduct} aria-busy={isLoading}>
        <label className="sr-only" htmlFor="home-product-url">Ссылка на товар</label>
        <input
          id="home-product-url"
          name="url"
          type="url"
          maxLength={2048}
          placeholder="Вставьте ссылку на товар"
          required
          autoComplete="url"
          value={productUrl}
          disabled={isLoading}
          aria-describedby={errorMessage ? "home-product-error" : undefined}
          aria-invalid={Boolean(errorMessage)}
          onChange={(event) => setProductUrl(event.target.value)}
        />
        <button className={styles.submit} type="submit" disabled={isLoading} data-loading={isLoading}>
          {isLoading ? "Проверяем…" : "Проверить"}
        </button>
      </form>

      <p className={styles.formError} id="home-product-error" role="alert" aria-live="polite">
        {errorMessage}
      </p>
    </>
  );
}
