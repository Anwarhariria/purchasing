<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Curriculum;
use Illuminate\Http\Request;

class CurriculumController extends Controller
{
    public function index(Request $request)
    {
        $curriculums = Curriculum::all();

        // If hierarchical tree format requested
        if ($request->query('format') === 'tree') {
            $groupedByProdi = $curriculums->groupBy('prodi');
            $tree = [];

            foreach ($groupedByProdi as $prodiName => $prodiItems) {
                $semesters = [];
                $groupedBySem = $prodiItems->groupBy('semester');

                foreach ($groupedBySem as $semNum => $semItems) {
                    $courses = [];
                    $groupedByCourse = $semItems->groupBy('course');

                    foreach ($groupedByCourse as $courseName => $courseItems) {
                        $menus = [];
                        foreach ($courseItems as $item) {
                            $menus[] = [
                                'menuName' => $item->menu_name,
                                'ingredients' => $item->ingredients,
                            ];
                        }
                        $courses[] = [
                            'courseName' => $courseName,
                            'menus' => $menus,
                        ];
                    }

                    $semesters[] = [
                        'semester' => (int)$semNum,
                        'courses' => $courses,
                    ];
                }

                $tree[] = [
                    'prodiName' => $prodiName,
                    'semesters' => $semesters,
                ];
            }

            return response()->json([
                'status' => 'success',
                'data' => $tree,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data' => $curriculums,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'prodi' => 'required|string',
            'semester' => 'required|integer',
            'course' => 'required|string',
            'menu_name' => 'required|string',
            'ingredients' => 'required|array',
        ]);

        $curriculum = Curriculum::create([
            'prodi' => $request->prodi,
            'semester' => $request->semester,
            'course' => $request->course,
            'menu_name' => $request->menu_name,
            'ingredients' => $request->ingredients,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Resep kurikulum berhasil ditambahkan.',
            'data' => $curriculum,
        ], 201);
    }
}
