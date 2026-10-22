<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProcurementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item' => 'nullable|string',
            'applicant' => 'nullable|string',
            'need_by' => 'nullable|date|after_or_equal:today',
            'needBy' => 'nullable|date|after_or_equal:today',
            'deadline' => 'nullable|date|after_or_equal:today',
            'details' => 'nullable|array',
            'details.*.price' => 'nullable|numeric|min:0|max:1000000000',
            'details.*.unit' => 'nullable|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'need_by.after_or_equal' => 'Tanggal kebutuhan tidak boleh sebelum hari ini.',
            'needBy.after_or_equal' => 'Tanggal kebutuhan tidak boleh sebelum hari ini.',
            'deadline.after_or_equal' => 'Tanggal kebutuhan tidak boleh sebelum hari ini.',
        ];
    }
}
