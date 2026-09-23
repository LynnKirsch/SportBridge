"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { NormalizedProduct } from "@/lib/suppliers/types";
import { readProductImportHandoff } from "@/lib/product-import-flow";
import { buildOrderRequest } from "@/lib/orders/build-order-request";

import styles from "./order-intake.module.css";

type Phase = "loading" | "ready" | "manual" | "submitting" | "success";

export function OrderIntakeForm({ flowId }: { flowId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [productUrl, setProductUrl] = useState("");
  const [product, setProduct] = useState<NormalizedProduct | null>(null);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [variant, setVariant] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    let isCurrent = true;

    queueMicrotask(() => {
      if (!isCurrent) return;

      const handoff = readProductImportHandoff(flowId);
      if (!handoff) {
        router.replace("/");
        return;
      }

      setProductUrl(handoff.productUrl);
      if (!handoff.result.ok) {
        setPhase("manual");
        return;
      }

      setProduct(handoff.result.product);
      setName(handoff.result.product.title);
      setSku(handoff.result.product.supplierSku ?? "");
      setPhase("ready");
    });

    return () => {
      isCurrent = false;
    };
  }, [flowId, router]);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhase("submitting");
    setNotice("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildOrderRequest({
          productUrl,
          name,
          sku,
          variant,
          color,
          quantity,
          comment,
          contactFirstName,
          contactLastName,
          contactEmail,
          contactPhone,
        })),
      });
      const result = await response.json() as {
        orderNumber?: string;
        fieldErrors?: Record<string, string>;
        message?: string;
      };

      if (!response.ok || !result.orderNumber) {
        setFieldErrors(result.fieldErrors ?? {});
        setNotice(result.message ?? "Проверьте введённые данные и попробуйте снова.");
        setPhase(product ? "ready" : "manual");
        return;
      }

      setOrderNumber(result.orderNumber);
      setPhase("success");
    } catch {
      setNotice("Не удалось отправить заказ. Данные не потеряны — попробуйте ещё раз.");
      setPhase(product ? "ready" : "manual");
    }
  }

  if (phase === "success") {
    return (
      <section className={`${styles.card} ${styles.success}`} aria-live="polite">
        <span className={styles.successMark} aria-hidden="true" />
        <h2>Заявка принята</h2>
        <p className={styles.orderNumber}>{orderNumber}</p>
        <p>Менеджер проверит товар и свяжется с вами. Расчёт цены будет подготовлен отдельно.</p>
      </section>
    );
  }

  const canSubmit = phase === "ready" || phase === "manual" || phase === "submitting";
  return (
    <div className={styles.flow}>
      {phase === "loading" && (
        <section className={`${styles.card} ${styles.loadingCard}`} aria-live="polite" aria-busy="true">
          <div className={styles.sectionHeading}>
            <h2>Проверяем товар</h2>
            <p>Получаем доступные данные со страницы магазина.</p>
          </div>
          <p className={styles.sourceUrl}>{productUrl}</p>
          <div className={styles.loadingPreview} aria-hidden="true">
            <span className={styles.loadingImage} />
            <span className={styles.loadingCopy}>
              <i />
              <i />
              <i />
            </span>
          </div>
        </section>
      )}

      {(product || phase === "manual") && (
        <section className={`${styles.card} ${styles.productCard}`}>
          {product ? (
            <article className={styles.preview}>
              {/* External supplier images are preview-only and are never persisted. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.primaryImageUrl} alt={`Изображение товара: ${product.title}`} />
              <div className={styles.productCopy}>
                <p className={styles.supplierName}>
                  {product.supplier === "BIKE24" ? "BIKE24" : "Bike-Discount"}
                </p>
                <h2>{product.title}</h2>
                {product.brand && <p className={styles.muted}>Бренд: {product.brand}</p>}
                {product.supplierSku && <p className={styles.muted}>Артикул: {product.supplierSku}</p>}
                {product.variants.length > 0 && (
                  <p className={styles.muted}>
                    Варианты: {product.variants.slice(0, 5).map((item, index) =>
                      item.size ?? item.name ?? item.id ?? `Вариант ${index + 1}`
                    ).join(", ")}
                  </p>
                )}
                {product.attributes.length > 0 && (
                  <dl className={styles.attributes}>
                    {product.attributes.slice(0, 5).map((attribute) => (
                      <div key={`${attribute.name}-${attribute.value}`}>
                        <dt>{attribute.name}</dt>
                        <dd>{attribute.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </article>
          ) : (
            <div className={styles.manualState}>
              <div className={styles.sectionHeading}>
                <h2>Заполните данные вручную</h2>
                <p>
                  Не удалось автоматически получить данные товара.<br />
                  Напишите всё, что вы знаете о товаре — менеджер проверит заявку.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {canSubmit && (
        <form onSubmit={submitOrder} className={`${styles.card} ${styles.detailsForm}`}>
          <header className={styles.formHeader}>
            <h2>Уточните заявку</h2>
            <p>Проверьте характеристики и дополните сведения о товаре, если это необходимо.</p>
          </header>

          <div className={styles.formGrid}>
            <Field label="Название товара" value={name} onChange={setName} maxLength={500} />
            <Field label="Артикул / SKU" value={sku} onChange={setSku} maxLength={120} />

            {product && product.variants.length > 0 ? (
              <label>Вариант / размер
                <select value={variant} onChange={(event) => setVariant(event.target.value)}>
                  <option value="">Не выбран</option>
                  {product.variants.map((item, index) => {
                    const value = item.size ?? item.name ?? item.id ?? `Вариант ${index + 1}`;
                    return <option key={`${item.id ?? value}-${index}`} value={value}>{value}</option>;
                  })}
                </select>
              </label>
            ) : (
              <Field label="Вариант / размер" value={variant} onChange={setVariant} maxLength={200} />
            )}
            <Field label="Цвет" value={color} onChange={setColor} maxLength={120} />
            <label>Количество *
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                required
                value={quantity}
                aria-invalid={Boolean(fieldErrors["items.0.quantity"])}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
              {fieldErrors["items.0.quantity"] && <small>{fieldErrors["items.0.quantity"]}</small>}
            </label>
            <label className={styles.wide}>Комментарий
              <textarea
                maxLength={2000}
                rows={4}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Например, важные детали выбранной комплектации"
              />
            </label>
          </div>

          <fieldset className={styles.contactSection}>
            <legend>Как с вами связаться</legend>
            <div className={styles.formGrid}>
              <label>Имя *
                <input
                  required
                  maxLength={59}
                  autoComplete="given-name"
                  value={contactFirstName}
                  aria-invalid={Boolean(fieldErrors.contactName)}
                  onChange={(event) => setContactFirstName(event.target.value)}
                />
              </label>
              <label>Фамилия *
                <input
                  required
                  maxLength={60}
                  autoComplete="family-name"
                  value={contactLastName}
                  aria-invalid={Boolean(fieldErrors.contactName)}
                  onChange={(event) => setContactLastName(event.target.value)}
                />
              </label>
              <label>Email
                <input
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={contactEmail}
                  aria-invalid={Boolean(fieldErrors.contactEmail)}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
                {fieldErrors.contactEmail && <small>{fieldErrors.contactEmail}</small>}
              </label>
              <label>Телефон
                <input
                  type="tel"
                  maxLength={40}
                  autoComplete="tel"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
              </label>
            </div>
            {fieldErrors.contactName && <small className={styles.contactError}>{fieldErrors.contactName}</small>}
          </fieldset>

          {notice && phase !== "manual" && <p className={styles.submitError} role="alert">{notice}</p>}
          {Object.keys(fieldErrors).length > 0 && <p className={styles.submitError}>Исправьте отмеченные поля.</p>}

          <footer className={styles.submitRow}>
            <p>Отправляя заявку, вы передаёте её менеджеру на ручную проверку.</p>
            <button type="submit" disabled={phase === "submitting"}>
              {phase === "submitting" ? "Отправляем…" : "Отправить на проверку"}
            </button>
          </footer>
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange, maxLength }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}) {
  return (
    <label>{label}
      <input maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
