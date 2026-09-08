export const pageHeader=(eyebrow,title,subtitle="")=>`<div><p class="eyebrow">${eyebrow}</p><h1 class="page-title">${title}</h1>${subtitle?`<p class="text-muted">${subtitle}</p>`:""}</div>`;
export const card=(content,dark=false,extra="")=>`<section class="card ${dark?"card--dark":""} ${extra}">${content}</section>`;
export const metric=(label,value)=>`<div class="metric"><div class="metric__label">${label}</div><div class="metric__value">${value}</div></div>`;
export const sourceBadge=source=>`<span class="badge badge--${source.toLowerCase()}">${source.toUpperCase()}</span>`;